import { errorResponse, successResponse, ErrorCodes } from "@/types/api";
import { verifyWebhookSignature } from "@/lib/payments/fapshi";
import { getPaymentByProviderRef, updatePaymentStatus } from "@/lib/db/queries/payments";
import type { PaymentStatus } from "@/types/db";

// Fapshi webhook receiver. Deliberately public — see middleware.ts's
// comment on why /api/payments/* has no auth gate — this route trusts a
// verified signature instead of a session/role.
//
// Header name and payload shape below follow Fapshi's publicly known
// pattern, NOT a confirmed spec — verify against Fapshi's current
// webhook docs (including whether they sign with HMAC or a shared
// secret) before relying on this in production.
const SIGNATURE_HEADER = "x-fapshi-signature";

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
