import type { ChargeInitiationInput, ChargeInitiationResult, PaymentResult } from "./types";

// Dev-only fake processor, opt-in via PAYMENTS_MODE=simulate (checked in
// lib/payments/charge.ts, which also logs a loud warning on every use) —
// lets the checkout flow be exercised before NotchPay/Fapshi sandbox
// credentials are provisioned. Never set PAYMENTS_MODE in production.
//
// Recorded as provider "notchpay" purely because the schema's `provider`
// CHECK constraint only allows real provider values — there's no other
// way to distinguish a simulated payment in the DB besides the
// console.warn logged at charge time, so keep PAYMENTS_MODE out of
// production deploys.

const ARTIFICIAL_DELAY_MIN_MS = 800;
const ARTIFICIAL_DELAY_JITTER_MS = 600;
const SUCCESS_RATE = 0.95;

export async function simulateCharge(
  input: ChargeInitiationInput,
): Promise<ChargeInitiationResult> {
  const delayMs = ARTIFICIAL_DELAY_MIN_MS + Math.floor(Math.random() * ARTIFICIAL_DELAY_JITTER_MS);
  await new Promise((r) => setTimeout(r, delayMs));

  if (Math.random() < SUCCESS_RATE) {
    return {
      kind: "push_sent",
      provider: "notchpay",
      providerRef: input.providerRef,
      providerTransactionId: null,
    };
  }
  return {
    kind: "failed",
    provider: "notchpay",
    message: "Simulated decline (5% random failure rate, for exercising failure-state UI).",
  };
}

// Used by the simulated poll/status path — a "push_sent" simulated charge
// resolves to success shortly after initiation, same 95% success rate.
export async function simulateChargeStatus(providerRef: string): Promise<PaymentResult> {
  const isSuccess = Math.random() < SUCCESS_RATE;
  return { status: isSuccess ? "success" : "failed", providerRef };
}
