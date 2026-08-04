import { z } from "zod";

// Payment method enum shared with the orders table (cod | momo | orange).
export const PaymentMethodSchema = z.enum(["cod", "momo", "orange"]);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

// Shared PaymentResult contract per context/architecture.md and
// context/workflows.md. The simulated payment processor and the future
// real MoMo/Orange Money integrations all return this shape — swapping
// in `momo.ts` / `orange.ts` post-MVP should require no changes to the
// order flow, UI, or admin reconciliation views.

export const PaymentResultSchema = z.object({
  status: z.enum(["success", "failed", "pending"]),
  providerRef: z.string().nullable(),
});
export type PaymentResult = z.infer<typeof PaymentResultSchema>;
