import { z } from "zod";
import { PaymentMethodSchema } from "@/lib/payments/types";

// First real file in this directory — every other Server Action in the
// app inlines its zod schema at the top of its own file (see
// lib/actions/dashboard.ts). Checkout's schema (a nested item array plus
// a payment-method-conditional required field) is meaningfully more
// complex than those one-liners, which is what justifies breaking that
// convention here rather than inlining it into lib/actions/checkout.ts.

export const checkoutItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().max(20),
});

export const checkoutSchema = z
  .object({
    retailerId: z.string().uuid(),
    addressId: z.string().uuid(),
    items: z.array(checkoutItemSchema).min(1, "Add at least one item"),
    paymentMethod: PaymentMethodSchema,
    // Required only for momo/orange (the number the provider pushes a
    // charge prompt to) — optional here so cod submissions don't need it.
    phone: z.string().trim().min(6).max(30).optional(),
  })
  .refine((data) => data.paymentMethod === "cod" || !!data.phone, {
    message: "A phone number is required for MoMo/Orange Money payments.",
    path: ["phone"],
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
