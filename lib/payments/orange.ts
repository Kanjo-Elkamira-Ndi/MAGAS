import type { PaymentResult } from "./types";

// Post-MVP stub — real Orange Money integration goes here.
export async function chargeWithOrange(_input: {
  orderId: string;
  amount: number;
}): Promise<PaymentResult> {
  throw new Error("Orange Money integration is deferred post-MVP.");
}
