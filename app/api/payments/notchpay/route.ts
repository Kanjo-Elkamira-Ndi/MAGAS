import { errorResponse, successResponse, ErrorCodes } from "@/types/api";
import { verifyWebhookSignature } from "@/lib/payments/notchpay";
import { getPaymentByProviderRef, updatePaymentStatus } from "@/lib/db/queries/payments";
import type { PaymentStatus } from "@/types/db";

// NotchPay webhook receiver. Deliberately public — see middleware.ts's
// comment on why /api/payments/* has no auth gate — this route trusts a
// verified signature instead of a session/role, since there is no
// session on an external provider POST. That's the one deliberate
// exception to "no route trusts a client-supplied role" in this app.
//
// Header (`x-notch-signature`, HMAC-SHA256) and the confirmed Payment
// status enum (pending | processing | complete | failed | canceled |
// expired) are verified against developer.notchpay.co. Every real API
// response nests the payment under a `transaction` key with the
// customer-supplied reference at `merchant_reference`/`trxref` (NOT the
// bare `reference` field, which is NotchPay's own id) — see the file
// header note in lib/payments/notchpay.ts for how that was confirmed
// against live data. The webhook payload's exact shape is still
// unconfirmed (no real delivery inspected yet), so both extractors below
// check several plausible locations rather than committing to one guess
// — simplify once a real webhook has been inspected via a tunnel's
// request log.
const SIGNATURE_HEADER = "x-notch-signature";

function extractReference(payload: Record<string, unknown>): string | undefined {
  const data = (payload.data ?? payload) as Record<string, unknown>;
  const transaction = (data.transaction ?? data) as Record<string, unknown>;
  const candidates = [transaction.merchant_reference, transaction.trxref];
  return candidates.find((c): c is string => typeof c === "string");
}

function extractStatus(payload: Record<string, unknown>): string | undefined {
  const data = (payload.data ?? payload) as Record<string, unknown>;
  const transaction = (data.transaction ?? data) as Record<string, unknown>;
  return typeof transaction.status === "string" ? transaction.status : undefined;
}

function mapStatus(raw: string | undefined): PaymentStatus | null {
  if (raw === "complete") return "success";
  if (raw === "failed" || raw === "canceled" || raw === "expired") return "failed";
  // pending | processing — no status change yet.
  return null;
}

export async function POST(req: Request) {
  // Raw text, not .json() — signature verification needs the exact
  // bytes NotchPay signed, and .json() would consume the stream first.
  const rawBody = await req.text();
  const signature = req.headers.get(SIGNATURE_HEADER);

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("[payments/notchpay] rejected webhook: invalid or missing signature");
    return errorResponse(ErrorCodes.UNAUTHORIZED, "Invalid signature.", 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, "Malformed payload.", 400);
  }

  const reference = extractReference(payload);
  const mapped = mapStatus(extractStatus(payload));

  if (!reference) {
    return successResponse({ ignored: true });
  }

  try {
    const payment = await getPaymentByProviderRef(reference);
    if (!payment) {
      // Not an error — could be a stale/test webhook. Don't cause the
      // provider to keep retrying over something we'll never resolve.
      console.warn(`[payments/notchpay] webhook for unrecognized reference ${reference}`);
      return successResponse({ ignored: true });
    }

    // updatePaymentStatus's WHERE status = 'pending' guard makes this
    // safe against redelivery — a repeat webhook for an already-resolved
    // payment is a silent no-op, not a double-write.
    if (mapped) {
      await updatePaymentStatus(payment.id, mapped);
    }

    return successResponse({ ok: true });
  } catch (err) {
    console.error("[payments/notchpay] webhook processing error", err);
    // 500 so NotchPay retries — this is an unexpected failure, distinct
    // from the "invalid signature" / "unrecognized reference" cases above.
    return errorResponse(ErrorCodes.INTERNAL_ERROR, "Failed to process webhook.", 500);
  }
}
