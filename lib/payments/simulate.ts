import { randomUUID } from "node:crypto";
import type { PaymentResult, PaymentMethod } from "./types";

// MVP simulated payment processor per context/workflows.md §5.
// Introduces an artificial delay to mimic a real provider round trip,
// then writes/updates a `payments` row with a fake provider_ref. On
// success, does NOT change orders.status — payment status and order
// status are decoupled concerns; a retailer still must confirm the
// order per workflow 4. Real MoMo/Orange Money wiring lives in
// `momo.ts` / `orange.ts` post-MVP and implements the same
// PaymentResult contract.

export interface SimulateInput {
  orderId: string;
  method: Extract<PaymentMethod, "momo" | "orange">;
  amount: number;
}

export async function simulatePayment(input: SimulateInput): Promise<PaymentResult> {
  const delayMs = 800 + Math.floor(Math.random() * 600);
  await new Promise((r) => setTimeout(r, delayMs));

  // 95% success rate — useful for exercising failure-state UI during dev.
  const isSuccess = Math.random() < 0.95;
  const providerRef = `SIM_${input.method.toUpperCase()}_${randomUUID()}`;

  return {
    status: isSuccess ? "success" : "failed",
    providerRef: isSuccess ? providerRef : null,
  };
}
