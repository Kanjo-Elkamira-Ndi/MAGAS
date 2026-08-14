import { timingSafeEqual } from "node:crypto";
import {
  ProviderUnavailableError,
  type ChargeInitiationInput,
  type ChargeInitiationResult,
  type PaymentResult,
} from "./types";
import { requireEnv } from "./env";

// Fapshi client — fallback payment provider (MTN MoMo + Orange Money
// aggregator for Cameroon), used only when NotchPay is unavailable.
//
// IMPORTANT: the request/response shapes below follow Fapshi's publicly
// known integration pattern (apiuser/apikey header auth, an initiate-pay
// endpoint returning either a hosted link or triggering a direct push,
// a status-by-transaction-id endpoint), NOT a verified current API spec
// — confirm exact field names and the webhook/signature mechanism
// against Fapshi's current docs before relying on this in production.
// Sandbox and live are separate subdomains, not just different keys on
// one host — set FAPSHI_API_BASE_URL per environment.

const DEFAULT_BASE_URL = "https://live.fapshi.com";
const REQUEST_TIMEOUT_MS = 9_000;

function baseUrl(): string {
  return process.env.FAPSHI_API_BASE_URL || DEFAULT_BASE_URL;
}

async function fapshiFetch(path: string, init: RequestInit): Promise<Response> {
  const apiUser = requireEnv("FAPSHI_API_USER");
  const apiKey = requireEnv("FAPSHI_API_KEY");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
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
  const providerRef = input.providerRef;
  const callbackBase = process.env.PAYMENTS_CALLBACK_BASE_URL || process.env.NEXTAUTH_URL || "";

  const res = await fapshiFetch("/initiate-pay", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      phone: input.phone,
      externalId: providerRef,
      redirectUrl: `${callbackBase}/customer/order/${input.orderId}`,
      message: `MAGAS order ${input.orderId}`,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return {
      kind: "failed",
      provider: "fapshi",
      message: body?.message ?? `Fapshi declined the charge (${res.status}).`,
    };
  }

  const body = await res.json();
  const transactionId: string | null = body?.transId ?? null;
  const link: string | undefined = body?.link;

  if (link) {
    return {
      kind: "redirect",
      provider: "fapshi",
      providerRef,
      providerTransactionId: transactionId,
      redirectUrl: link,
    };
  }
  return {
    kind: "push_sent",
    provider: "fapshi",
    providerRef,
    providerTransactionId: transactionId,
  };
}

export function verifyWebhookSignature(
  _rawBody: string,
  signatureHeader: string | null,
): boolean {
  // Fapshi's signing scheme needs confirming against current docs — some
  // aggregators use a static shared-secret comparison rather than HMAC.
  // Implemented here as a constant-time shared-secret comparison against
  // the header only (rawBody unused in this scheme, kept in the
  // signature for parity with notchpay.ts); swap for HMAC verification
  // if Fapshi's docs specify one instead.
  if (!signatureHeader) return false;
  const webhookSecret = process.env.FAPSHI_WEBHOOK_SECRET;
  if (!webhookSecret) return false;
  try {
    return timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(webhookSecret));
  } catch {
    return false;
  }
}

export async function getChargeStatus(ref: {
  providerRef: string;
  providerTransactionId?: string | null;
}): Promise<PaymentResult> {
  const id = ref.providerTransactionId ?? ref.providerRef;
  const res = await fapshiFetch(`/payment-status/${id}`, { method: "GET" });
  const body = await res.json().catch(() => null);
  const status: string | undefined = body?.status;
  if (status === "SUCCESSFUL") {
    return { status: "success", providerRef: ref.providerRef };
  }
  if (status === "FAILED" || status === "EXPIRED") {
    return { status: "failed", providerRef: ref.providerRef };
  }
  return { status: "pending", providerRef: ref.providerRef };
}
