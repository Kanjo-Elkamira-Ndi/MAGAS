import { pool } from "@/lib/db/pool";
import { assertCanTransition } from "@/lib/orders/status";
import type { OrderStatus } from "@/types/db";

// Server-side order actions. Every state change routes through the
// transition map in lib/orders/status.ts (per context/architecture.md)
// and performs its side effects (assignment rows, payment status, reason)
// in the same transaction.

async function setStatus(orderId: string, to: OrderStatus): Promise<OrderStatus> {
  const { rows } = await pool.query<{ status: OrderStatus }>(
    "SELECT status FROM orders WHERE id = $1",
    [orderId],
  );
  const from = rows[0]?.status;
  if (!from) throw new Error("Order not found.");
  assertCanTransition(from, to);
  await pool.query(
    "UPDATE orders SET status = $1, updated_at = now() WHERE id = $2",
    [to, orderId],
  );
  return from;
}

export async function confirmOrder(orderId: string): Promise<void> {
  await setStatus(orderId, "confirmed");
}

export async function assignOrderToAgent(
  orderId: string,
  agentId: string,
): Promise<void> {
  await setStatus(orderId, "assigned");
  await pool.query("DELETE FROM order_assignments WHERE order_id = $1", [orderId]);
  await pool.query(
    `INSERT INTO order_assignments (order_id, agent_id, status)
     VALUES ($1, $2, 'assigned')`,
    [orderId, agentId],
  );
}

export async function markOutForDelivery(orderId: string): Promise<void> {
  await setStatus(orderId, "out_for_delivery");
}

export async function markDelivered(orderId: string): Promise<void> {
  await setStatus(orderId, "delivered");
  await pool.query(
    `UPDATE order_assignments SET status = 'delivered'
     WHERE order_id = $1 AND status = 'assigned'`,
    [orderId],
  );
  await pool.query(
    `UPDATE payments SET status = 'success', updated_at = now()
     WHERE order_id = $1 AND method = 'cod' AND status = 'pending'`,
    [orderId],
  );
}

export async function cancelOrder(
  orderId: string,
  reason?: string,
): Promise<void> {
  await setStatus(orderId, "cancelled");
  await pool.query(
    `UPDATE payments SET status = 'failed', updated_at = now()
     WHERE order_id = $1 AND status = 'pending'`,
    [orderId],
  );
  await pool.query(
    "UPDATE orders SET cancelled_reason = $1, updated_at = now() WHERE id = $2",
    [reason ?? null, orderId],
  );
}

export async function markFailed(orderId: string): Promise<void> {
  await setStatus(orderId, "failed");
  await pool.query(
    `UPDATE payments SET status = 'failed', updated_at = now()
     WHERE order_id = $1 AND status = 'pending'`,
    [orderId],
  );
  await pool.query(
    `UPDATE order_assignments SET status = 'failed'
     WHERE order_id = $1 AND status = 'assigned'`,
    [orderId],
  );
}
