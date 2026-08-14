import { createHmac, timingSafeEqual } from "node:crypto";
import {
  ProviderUnavailableError,
  type ChargeInitiationInput,
  type ChargeInitiationResult,
  type PaymentResult,
} from "./types";
import { requireEnv } from "./env";

// NotchPay client — primary payment provider (MTN MoMo + Orange Money
// aggregator for Cameroon).
//
// IMPORTANT: the request/response shapes below follow the general
// aggregator pattern (initialize a charge → get a redirect URL or a
// direct push → resolve via webhook / status poll), NOT a verified API
// spec. Confirm exact endpoint paths, field names, and the webhook
// signature header/scheme against NotchPay's current docs before
// relying on this in production.

const DEFAULT_BASE_URL = "https://api.notchpay.co";
const REQUEST_TIMEOUT_MS = 9_000;

function baseUrl(): string {
  return process.env.NOTCHPAY_API_BASE_URL || DEFAULT_BASE_URL;
}

async function notchpayFetch(path: string, init: RequestInit): Promise<Response> {
  const secretKey = requireEnv("NOTCHPAY_SECRET_KEY");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
        ...init.headers,
      },
    });
    if (res.status === 401 || res.status === 403) {
      throw new ProviderUnavailableError("notchpay", `NotchPay auth failed (${res.status}).`);
    }
    if (res.status >= 500) {
      throw new ProviderUnavailableError("notchpay", `NotchPay returned ${res.status}.`);
    }
    return res;
  } catch (err) {
    if (err instanceof ProviderUnavailableError) throw err;
    // Network error, DNS failure, or the AbortController timeout firing.
    throw new ProviderUnavailableError(
      "notchpay",
      err instanceof Error ? err.message : "NotchPay request failed.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function initiateCharge(
  input: ChargeInitiationInput,
): Promise<ChargeInitiationResult> {
  const providerRef = input.providerRef;
  const res = await notchpayFetch("/payments", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      currency: "XAF",
      reference: providerRef,
      email: input.customerEmail,
      phone: input.phone,
      channel: input.method === "momo" ? "cm.mtn" : "cm.orange",
      description: `MAGAS order ${input.orderId}`,
    }),
  });

  if (!res.ok) {
    // A clean decline (4xx other than auth) — a real outcome, not an
    // availability problem, so this returns a result rather than
    // throwing ProviderUnavailableError, and must NOT trigger the
    // Fapshi fallback.
    const body = await res.json().catch(() => null);
    return {
      kind: "failed",
      provider: "notchpay",
      message: body?.message ?? `NotchPay declined the charge (${res.status}).`,
    };
  }

  const body = await res.json();
  const transactionId: string | null = body?.transaction?.reference ?? body?.data?.id ?? null;
  const redirectUrl: string | undefined =
    body?.authorization_url ?? body?.data?.authorization_url;

  if (redirectUrl) {
    return {
      kind: "redirect",
      provider: "notchpay",
      providerRef,
      providerTransactionId: transactionId,
      redirectUrl,
    };
  }
  return {
    kind: "push_sent",
    provider: "notchpay",
    providerRef,
    providerTransactionId: transactionId,
  };
}

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!signatureHeader) return false;
  const webhookSecret = process.env.NOTCHPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return false;
  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    // Buffer length mismatch throws inside timingSafeEqual — treat as an
    // invalid signature rather than letting the exception propagate.
    return false;
  }
}

export async function getChargeStatus(ref: {
  providerRef: string;
  providerTransactionId?: string | null;
}): Promise<PaymentResult> {
  const res = await notchpayFetch(
    `/payments/${ref.providerTransactionId ?? ref.providerRef}`,
    { method: "GET" },
  );
  const body = await res.json().catch(() => null);
  const status: string | undefined = body?.transaction?.status ?? body?.data?.status;
  if (status === "complete" || status === "success") {
    return { status: "success", providerRef: ref.providerRef };
  }
  if (status === "failed" || status === "canceled" || status === "expired") {
    return { status: "failed", providerRef: ref.providerRef };
  }
  return { status: "pending", providerRef: ref.providerRef };
}
