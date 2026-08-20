import { errorResponse, successResponse, ErrorCodes } from "@/types/api";
import { verifyWebhookSignature } from "@/lib/payments/fapshi";
import { getPaymentByProviderRef, updatePaymentStatus } from "@/lib/db/queries/payments";
import type { PaymentStatus } from "@/types/db";

// Fapshi webhook receiver. Deliberately public — see middleware.ts's
// comment on why /api/payments/* has no auth gate — this route trusts a
// verified signature instead of a session/role.
//
// Verified against Fapshi's own docs (docs.fapshi.com/en/api-reference/
// endpoint/webhook): the webhook secret configured per-service in the
// dashboard is sent back as the `x-wh-secret` header, checked via a
// constant-time equality comparison in verifyWebhookSignature — not
// HMAC. Payload fields match the /payment-status response shape
// (externalId, status, etc). Important operational note: Fapshi sends
// exactly one webhook attempt per event and does NOT retry on failure —
// components/dashboard/payment-status-poller.tsx's poll fallback is
// what catches anything this handler misses.
const SIGNATURE_HEADER = "x-wh-secret";

function mapStatus(raw: string | undefined): PaymentStatus | null {
  if (raw === "SUCCESSFUL") return "success";
  if (raw === "FAILED" || raw === "EXPIRED") return "failed";
  return null;
}

export async function POST(req: Request) {
  // Raw text, not .json() — signature verification needs the exact
  // bytes Fapshi signed, and .json() would consume the stream first.
  const rawBody = await req.text();
  const signature = req.headers.get(SIGNATURE_HEADER);

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("[payments/fapshi] rejected webhook: invalid or missing signature");
    return errorResponse(ErrorCodes.UNAUTHORIZED, "Invalid signature.", 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, "Malformed payload.", 400);
  }

  const reference = typeof payload.externalId === "string" ? payload.externalId : undefined;
  const mapped = mapStatus(typeof payload.status === "string" ? payload.status : undefined);

  if (!reference) {
    return successResponse({ ignored: true });
  }

  try {
    const payment = await getPaymentByProviderRef(reference);
    if (!payment) {
      console.warn(`[payments/fapshi] webhook for unrecognized reference ${reference}`);
      return successResponse({ ignored: true });
    }

    // updatePaymentStatus's WHERE status = 'pending' guard makes this
    // safe against redelivery.
    if (mapped) {
      await updatePaymentStatus(payment.id, mapped);
    }

    return successResponse({ ok: true });
  } catch (err) {
    console.error("[payments/fapshi] webhook processing error", err);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, "Failed to process webhook.", 500);
  }
}
