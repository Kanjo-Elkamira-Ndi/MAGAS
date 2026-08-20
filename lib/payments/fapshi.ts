import { timingSafeEqual } from "node:crypto";
import {
  ProviderUnavailableError,
  type ChargeInitiationInput,
  type ChargeInitiationResult,
  type PaymentResult,
} from "./types";
import { requireEnv } from "./env";

// Fapshi client — fallback payment provider (MTN MoMo + Orange Money
// aggregator for Cameroon), used only when NotchPay (the primary — see
// lib/payments/notchpay.ts) is unavailable. Verified against Fapshi's
// own docs (docs.fapshi.com).
//
// - Auth: `apiuser` + `apikey` headers (lowercase, both required on every
//   request), from a "service" created in the Fapshi dashboard
//   (Developers → New Service). Sandbox and live credentials are shown
//   in separate sections of the same service, and are genuinely
//   different subdomains, not just different keys on one host.
// - Charging: /direct-pay (not /initiate-pay — that endpoint returns a
//   hosted link and has no `phone` field at all; every momo/orange
//   charge in this app collects a phone number and expects a direct
//   USSD/app push, which is exactly what /direct-pay does).
// - `externalId` is Fapshi's field for *our* reference — carries
//   ChargeInitiationInput.providerRef through so a webhook can be
//   matched back to the right payments row. Pattern-constrained to
//   `^[a-zA-Z0-9\-_]{1,100}$`, which a plain randomUUID() satisfies.
// - Status polling is by Fapshi's own `transId` (returned from
//   /direct-pay), not by our externalId — /payment-status/{transId}
//   only accepts their ID. Rate-limited to 6 requests/minute per
//   transaction; the 15s poll interval in
//   components/dashboard/payment-status-poller.tsx stays well under that.
// - Webhooks are a single best-effort POST — Fapshi does NOT retry on
//   failure or non-200, unlike most providers — so the poll fallback
//   here matters more for Fapshi than it would otherwise.

const REQUEST_TIMEOUT_MS = 9_000;

function baseUrl(): string {
  if (process.env.FAPSHI_API_BASE_URL) return process.env.FAPSHI_API_BASE_URL;
  return process.env.NODE_ENV === "production"
    ? "https://live.fapshi.com"
    : "https://sandbox.fapshi.com";
}

function medium(method: ChargeInitiationInput["method"]): "mobile money" | "orange money" {
  return method === "momo" ? "mobile money" : "orange money";
}

async function fapshiFetch(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    // Inside the try block on purpose — a missing credential should
    // degrade to "this provider is unavailable" (triggering the other
    // provider's fallback) rather than crashing the caller outright.
    const apiUser = requireEnv("FAPSHI_API_USER");
    const apiKey = requireEnv("FAPSHI_API_KEY");
    const res = await fetch(`${baseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        apiuser: apiUser,
        apikey: apiKey,
        ...init.headers,
      },
    });
    if (res.status === 401 || res.status === 403) {
      throw new ProviderUnavailableError("fapshi", `Fapshi auth failed (${res.status}).`);
    }
    if (res.status >= 500) {
      throw new ProviderUnavailableError("fapshi", `Fapshi returned ${res.status}.`);
    }
    return res;
  } catch (err) {
    if (err instanceof ProviderUnavailableError) throw err;
    throw new ProviderUnavailableError(
      "fapshi",
      err instanceof Error ? err.message : "Fapshi request failed.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function initiateCharge(
  input: ChargeInitiationInput,
): Promise<ChargeInitiationResult> {
  const res = await fapshiFetch("/direct-pay", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      phone: input.phone,
      medium: medium(input.method),
      email: input.customerEmail,
      externalId: input.providerRef,
      message: `MAGAS order ${input.orderId}`,
    }),
  });

  if (!res.ok) {
    // A clean decline (4xx) — a real outcome, not an availability
    // problem, so this returns a result rather than throwing
    // ProviderUnavailableError, and must NOT trigger the NotchPay
    // fallback.
    const body = await res.json().catch(() => null);
    return {
      kind: "failed",
      provider: "fapshi",
      message: body?.message ?? `Fapshi declined the charge (${res.status}).`,
    };
  }

  // /direct-pay's 200 response is { message, transId, dateInitiated } —
  // no `link`, since this always triggers a direct push, never a hosted
  // checkout page.
  const body = await res.json();
  return {
    kind: "push_sent",
    provider: "fapshi",
    providerRef: input.providerRef,
    providerTransactionId: body?.transId ?? null,
  };
}

export function verifyWebhookSignature(
  _rawBody: string,
  signatureHeader: string | null,
): boolean {
  // Confirmed: Fapshi signs webhooks with a plain shared secret in the
  // `x-wh-secret` header (set per-service in the dashboard), not HMAC —
  // a direct equality check against the configured secret, done in
  // constant time. rawBody is unused in this scheme (kept in the
  // signature for parity with notchpay.ts, which does use it for HMAC).
  if (!signatureHeader) return false;
  const webhookSecret = process.env.FAPSHI_WEBHOOK_SECRET;
  if (!webhookSecret) return false;
  try {
    return timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(webhookSecret));
  } catch {
    // Buffer length mismatch throws inside timingSafeEqual — treat as
    // an invalid signature rather than letting the exception propagate.
    return false;
  }
}

export async function getChargeStatus(ref: {
  providerRef: string;
  providerTransactionId?: string | null;
}): Promise<PaymentResult> {
  // /payment-status/{transId} only accepts Fapshi's own transaction ID,
  // never our externalId — if we never got one back from /direct-pay
  // (shouldn't happen on a successful "push_sent" result, but possible
  // if a status check races the initiation response), there is nothing
  // to poll yet.
  if (!ref.providerTransactionId) {
    return { status: "pending", providerRef: ref.providerRef };
  }

  const res = await fapshiFetch(`/payment-status/${ref.providerTransactionId}`, {
    method: "GET",
  });
  const body = await res.json().catch(() => null);
  const status: string | undefined = body?.status;
  if (status === "SUCCESSFUL") {
    return { status: "success", providerRef: ref.providerRef };
  }
  if (status === "FAILED" || status === "EXPIRED") {
    return { status: "failed", providerRef: ref.providerRef };
  }
  // CREATED | PENDING
  return { status: "pending", providerRef: ref.providerRef };
}
