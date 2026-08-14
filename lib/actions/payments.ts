"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { pool } from "@/lib/db/pool";
import {
  createPayment,
  getLatestPaymentForOrder,
  updatePaymentProviderAttempt,
  updatePaymentStatus,
  type PaymentListItem,
} from "@/lib/db/queries/payments";
import * as notchpay from "@/lib/payments/notchpay";
import * as fapshi from "@/lib/payments/fapshi";
import { simulateChargeStatus } from "@/lib/payments/simulate";
import { chargeOrder } from "@/lib/payments/charge";
import type { ChargeInitiationResult } from "@/lib/payments/types";

// Payment lifecycle actions distinct from checkout (which only ever
// creates the *first* payment attempt) — kept in their own file, mirroring
// why lib/actions/agent.ts and lib/actions/tracking.ts were split out of
// dashboard.ts: pollPaymentStatusAction is polled at a much higher
// frequency than a typical action.

const orderIdSchema = z.string().uuid();

function roleError(): never {
  throw new Error("You are not allowed to perform this action.");
}

async function requireOrderAccess(orderId: string): Promise<void> {
  const session = await getSession();
  if (!session?.user?.id) roleError();

  const { rows } = await pool.query<{ customer_id: string }>(
    "SELECT customer_id FROM orders WHERE id = $1",
    [orderId],
  );
  const order = rows[0];
  if (!order) roleError();

  const allowed =
    (session.user.role === "customer" && order.customer_id === session.user.customerId) ||
    session.user.role === "admin";
  if (!allowed) roleError();
}

// Actively re-checks the *provider's* status API each tick (not just the
// DB) — this is what makes it a genuine fallback for a missed webhook,
// not a redundant reflection of state that will never change without one.
export async function pollPaymentStatusAction(
  orderId: string,
): Promise<PaymentListItem | null> {
  const id = orderIdSchema.parse(orderId);
  await requireOrderAccess(id);

  const payment = await getLatestPaymentForOrder(id);
  if (!payment || payment.status !== "pending" || !payment.provider) {
    return payment;
  }

  try {
    const ref = { providerRef: payment.provider_ref ?? "" };
    const result =
      process.env.PAYMENTS_MODE === "simulate"
        ? await simulateChargeStatus(ref.providerRef)
        : payment.provider === "notchpay"
          ? await notchpay.getChargeStatus(ref)
          : await fapshi.getChargeStatus(ref);

    if (result.status !== "pending") {
      await updatePaymentStatus(payment.id, result.status);
      return { ...payment, status: result.status };
    }
  } catch {
    // A failed status check this tick isn't fatal — report the
    // last-known DB state and let the next tick try again.
  }

  return payment;
}

const retrySchema = z.object({
  orderId: z.string().uuid(),
  phone: z.string().trim().min(6).max(30),
});

// Re-runs the charge orchestrator against the same order, inserting a
// *new* payments row rather than mutating the failed one — preserves
// full attempt history. Phone is re-collected rather than reused from
// the original attempt (not persisted anywhere; the customer may also
// want to retry with a different number).
export async function retryPaymentAction(
  orderId: string,
  phone: string,
): Promise<{ chargeResult: ChargeInitiationResult }> {
  const session = await getSession();
  const customerId = session?.user?.customerId;
  if (!customerId) roleError();
  const data = retrySchema.parse({ orderId, phone });

  const { rows } = await pool.query<{
    customer_id: string;
    status: string;
    payment_method: "cod" | "momo" | "orange";
    total_amount: number;
  }>(
    "SELECT customer_id, status, payment_method, total_amount FROM orders WHERE id = $1",
    [data.orderId],
  );
  const order = rows[0];
  if (!order || order.customer_id !== customerId) roleError();
  if (order.payment_method === "cod") {
    throw new Error("Cash on delivery doesn't need a payment retry.");
  }
  if (order.status !== "placed") {
    throw new Error("This order can no longer be retried.");
  }

  const latest = await getLatestPaymentForOrder(data.orderId);
  if (!latest || latest.status !== "failed") {
    throw new Error("There's no failed payment to retry.");
  }

  const providerRef = randomUUID();
  const payment = await createPayment({
    orderId: data.orderId,
    method: order.payment_method,
    amount: order.total_amount,
    providerRef,
  });

  const chargeResult = await chargeOrder({
    orderId: data.orderId,
    method: order.payment_method,
    amount: order.total_amount,
    phone: data.phone,
    providerRef,
  });

  await updatePaymentProviderAttempt(payment.id, {
    provider: chargeResult.provider,
    providerTransactionId:
      chargeResult.kind === "failed" ? null : chargeResult.providerTransactionId,
    status: chargeResult.kind === "failed" ? "failed" : undefined,
  });

  revalidatePath(`/customer/order/${data.orderId}`);
  return { chargeResult };
}
