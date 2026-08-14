import { z } from "zod";

// Payment method enum shared with the orders table (cod | momo | orange).
// NotchPay/Fapshi sit *behind* momo/orange from the customer's point of
// view — which aggregator actually processed a given attempt is recorded
// separately via PaymentProviderSchema, not a new payment_method value.
export const PaymentMethodSchema = z.enum(["cod", "momo", "orange"]);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const PaymentProviderSchema = z.enum(["notchpay", "fapshi"]);
export type PaymentProvider = z.infer<typeof PaymentProviderSchema>;

// Shared PaymentResult contract — the *final resolved* shape a payment
// settles into, used to update the payments row from a webhook, a poll
// tick, or the simulated processor. Still accurate for that purpose.
export const PaymentResultSchema = z.object({
  status: z.enum(["success", "failed", "pending"]),
  providerRef: z.string().nullable(),
});
export type PaymentResult = z.infer<typeof PaymentResultSchema>;

// Charge *initiation* is a separate, inherently async concern from
// PaymentResult above: starting a real online charge doesn't resolve
// immediately — it either hands back a hosted-checkout URL to redirect
// to, confirms a direct USSD/app push was sent to the customer's phone,
// or fails outright (declined, or both providers unavailable). Resolution
// arrives later via webhook or poll, updating the same payments row this
// initiation created.
export const chargeInitiationInputSchema = z.object({
  orderId: z.string().uuid(),
  method: z.enum(["momo", "orange"]),
  amount: z.number().int().positive(),
  phone: z.string().min(6),
  customerEmail: z.string().email().optional(),
  // Generated once by the caller (lib/actions/checkout.ts) and stored on
  // the payments row *before* any provider is called, so a webhook that
  // arrives before initiateCharge()'s HTTP call even returns can still be
  // matched to the right row. Reused as-is if NotchPay fails over to
  // Fapshi — only one provider ever ends up actually processing a given
  // attempt, so both can safely share the same reference.
  providerRef: z.string().min(1),
});
export type ChargeInitiationInput = z.infer<typeof chargeInitiationInputSchema>;

export type ChargeInitiationResult =
  | {
      kind: "redirect";
      provider: PaymentProvider;
      providerRef: string;
      providerTransactionId: string | null;
      redirectUrl: string;
    }
  | {
      kind: "push_sent";
      provider: PaymentProvider;
      providerRef: string;
      providerTransactionId: string | null;
    }
  | {
      kind: "failed";
      provider: PaymentProvider;
      message: string;
    };

// Thrown by a provider client when the provider itself is unreachable
// (network error, timeout, 5xx, auth failure) — distinct from a clean
// decline, which is a real ChargeInitiationResult, not an exception.
// Only ProviderUnavailableError should trigger the NotchPay → Fapshi
// fallback in lib/payments/charge.ts; a decline must never fall through
// to the other provider.
export class ProviderUnavailableError extends Error {
  constructor(
    public readonly provider: PaymentProvider,
    message: string,
  ) {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}
