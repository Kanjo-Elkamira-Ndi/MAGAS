import { createHmac, timingSafeEqual } from "node:crypto";
import {
  ProviderUnavailableError,
  type ChargeInitiationInput,
  type ChargeInitiationResult,
  type PaymentResult,
} from "./types";
import { requireEnv } from "./env";

// NotchPay client — primary payment provider (MTN MoMo + Orange Money
// aggregator for Cameroon); Fapshi (lib/payments/fapshi.ts) is the
// fallback, used only when NotchPay is unavailable. Verified against
// developer.notchpay.co (unlike the pass fapshi.ts got, two specifics
// stayed genuinely ambiguous in NotchPay's own docs even after reading
// them — flagged inline at the exact lines they affect below, not
// guessed silently.
//
// - Auth: two headers together on every request — `Authorization` with
//   the public key (`pk_test_...` in test mode) and `X-Grant` with the
//   secret key (`sk_test_...`). Docs describe these as "standard" vs
//   "advanced/sensitive-operation" auth rather than spelling out exactly
//   which of our calls needs which, so both are sent on everything —
//   harmless if one is only ever checked for some endpoints.
// - Base URL is a single host (`https://api.notchpay.co`) for both test
//   and live — unlike Fapshi's separate subdomains, NotchPay
//   distinguishes sandbox vs live purely by which key prefix you use
//   (`pk_test_`/`sk_test_` vs unprefixed live keys).
// - Charging is a single step, by design: POST /payments *initializes* a
//   payment and returns a hosted-checkout `authorization_url` (confirmed
//   at the top level of the response, sibling to `transaction`) — the
//   customer is redirected there to complete payment on NotchPay's own
//   page. NotchPay also supports a second step (PUT /payments/{id},
//   processing directly against a channel + phone for a USSD/app push
//   with no redirect) but this app deliberately doesn't use it: the
//   hosted-checkout redirect is simpler, doesn't depend on the two
//   still-ambiguous specifics of the direct-charge step, and is what
//   "click Place order → land on the NotchPay page" means product-wise.
// - RESOLVED (was AMBIGUITY 1, confirmed against a real live GET
//   /payments/{reference} response): every response wraps the actual
//   payment under a **`transaction`** object, not at the top level —
//   `{ status: "OK", message, code, transaction: { reference,
//   merchant_reference, trxref, status, amount, ... } }`. The top-level
//   `status` is just the API envelope's own status ("OK" on any
//   successful call) — the real payment status is `transaction.status`.
//   `transaction.reference` (e.g. "trx.xxx...") is NotchPay's own
//   transaction id, used as the `{reference}` path param on the process
//   and retrieve-status endpoints. `transaction.merchant_reference` /
//   `transaction.trxref` (identical values) are *our* reference
//   (ChargeInitiationInput.providerRef) round-tripped back. An earlier
//   version of this file read `initBody.transaction` as if it were the
//   ID string itself, and `body.status` as the payment status — both
//   wrong, confirmed by three real transactions silently stuck
//   "pending" in the DB while NotchPay had already resolved them to
//   "failed". Fixed below; flagging the mistake here so it isn't
//   reintroduced.
// - AMBIGUITY 2 (still open, no real webhook delivery inspected yet):
//   the webhook payload shape is unconfirmed — plausibly `data` mirrors
//   the same `transaction` shape directly, or wraps it under another
//   `transaction` key. The webhook route checks both, preferring
//   `merchant_reference`/`trxref` (now confirmed as *our* reference
//   field name) over a bare `reference` (which is NotchPay's own id,
//   not ours — matching against it would never find our row). Verify
//   against a real webhook delivery (a tunnel's request inspector) and
//   simplify once confirmed.

const DEFAULT_BASE_URL = "https://api.notchpay.co";
const REQUEST_TIMEOUT_MS = 9_000;

function baseUrl(): string {
  return process.env.NOTCHPAY_API_BASE_URL || DEFAULT_BASE_URL;
}

async function notchpayFetch(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    // Inside the try block on purpose — a missing credential should
    // degrade to "this provider is unavailable" (triggering the other
    // provider's fallback) rather than crashing the caller outright.
    const publicKey = requireEnv("NOTCHPAY_PUBLIC_KEY");
    const secretKey = requireEnv("NOTCHPAY_SECRET_KEY");
    const res = await fetch(`${baseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: publicKey,
        "X-Grant": secretKey,
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
  // Without a callback, NotchPay leaves the customer stranded on their
  // hosted page after paying — confirmed by inspecting a real response,
  // where the field came back `"callback":null` since nothing was sent.
  const callbackBase = process.env.NEXTAUTH_URL ?? "";
  const initRes = await notchpayFetch("/payments", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      currency: "XAF",
      reference: input.providerRef,
      email: input.customerEmail,
      phone: input.phone,
      description: `MAGAS order ${input.orderId}`,
      callback: `${callbackBase}/customer/order/${input.orderId}`,
    }),
  });

  if (!initRes.ok) {
    // A clean decline (4xx other than auth) — a real outcome, not an
    // availability problem, so this returns a result rather than
    // throwing ProviderUnavailableError, and must NOT trigger the
    // Fapshi fallback.
    const body = await initRes.json().catch(() => null);
    return {
      kind: "failed",
      provider: "notchpay",
      message: body?.message ?? `NotchPay declined the charge (${initRes.status}).`,
    };
  }

  const initBody = await initRes.json();
  // Confirmed shape (real request/response, not a guess): the payment
  // itself is nested under `transaction`, while `authorization_url` is
  // a top-level sibling — { status, message, code, transaction: {
  // reference, merchant_reference, ... }, authorization_url }.
  const transactionId: string | undefined = initBody?.transaction?.reference;
  const authorizationUrl: string | undefined = initBody?.authorization_url;

  if (!transactionId || !authorizationUrl) {
    return {
      kind: "failed",
      provider: "notchpay",
      message: "NotchPay did not return a payment link.",
    };
  }

  return {
    kind: "redirect",
    provider: "notchpay",
    providerRef: input.providerRef,
    providerTransactionId: transactionId,
    redirectUrl: authorizationUrl,
  };
}

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  // Confirmed: NotchPay signs webhooks with HMAC-SHA256 over the raw
  // JSON body, keyed by the webhook hash from Business suite → Settings
  // → API Keys, sent in the `x-notch-signature` header as a hex digest.
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
  // Using NotchPay's own transaction id (transaction.reference from
  // initiation), not our reference — confirmed correct, see file header.
  if (!ref.providerTransactionId) {
    return { status: "pending", providerRef: ref.providerRef };
  }

  const res = await notchpayFetch(`/payments/${ref.providerTransactionId}`, {
    method: "GET",
  });
  const body = await res.json().catch(() => null);
  // Confirmed against a real response: the payment is nested under
  // `transaction`; `body.status` is the API envelope's own status
  // ("OK"), NEVER the payment status — reading it directly here was the
  // second half of the bug that left real failed/succeeded payments
  // stuck reporting "pending" forever, since "OK" never matches any of
  // the enum values below.
  // Confirmed Payment.status enum: pending | processing | complete |
  // failed | canceled | expired.
  const status: string | undefined = body?.transaction?.status;
  if (status === "complete") {
    return { status: "success", providerRef: ref.providerRef };
  }
  if (status === "failed" || status === "canceled" || status === "expired") {
    return { status: "failed", providerRef: ref.providerRef };
  }
  // pending | processing
  return { status: "pending", providerRef: ref.providerRef };
}
