import type { PaymentResult } from "./types";

// Post-MVP stub — real MTN Mobile Money integration goes here.
// Per context/workflows.md, implementing this file (against the same
// PaymentResult contract) is the only change needed to swap simulated
// payments for live. Do not implement without explicit go-ahead.
export async function chargeWithMomo(_input: {
  orderId: string;
  amount: number;
}): Promise<PaymentResult> {
  throw new Error("MTN MoMo integration is deferred post-MVP.");
}
