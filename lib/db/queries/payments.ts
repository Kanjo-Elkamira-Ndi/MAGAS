import type { PoolClient } from "pg";
import { pool } from "@/lib/db/pool";
import type { PaymentStatus, PaymentMethod, PaymentProvider } from "@/types/db";

export type PaymentListItem = {
  id: string;
  order_id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  provider: PaymentProvider | null;
  provider_ref: string | null;
  amount: number;
  created_at: Date;
  customer_name?: string | null;
  retailer_name?: string | null;
};

export async function getPaymentsByRetailer(
  retailerId: string,
): Promise<PaymentListItem[]> {
  const { rows } = await pool.query<PaymentListItem>(
    `SELECT p.id, p.order_id, p.method, p.status, p.provider, p.provider_ref, p.amount, p.created_at,
            c.full_name AS customer_name
     FROM payments p
     JOIN orders o ON o.id = p.order_id
     JOIN customers c ON c.user_id = o.customer_id
     WHERE o.retailer_id = $1
     ORDER BY p.created_at DESC`,
    [retailerId],
  );
  return rows;
}

export async function getAllPayments(): Promise<PaymentListItem[]> {
  const { rows } = await pool.query<PaymentListItem>(
    `SELECT p.id, p.order_id, p.method, p.status, p.provider, p.provider_ref, p.amount, p.created_at,
            c.full_name AS customer_name,
            rt.business_name AS retailer_name
     FROM payments p
     JOIN orders o ON o.id = p.order_id
     JOIN customers c ON c.user_id = o.customer_id
     JOIN retailers rt ON rt.id = o.retailer_id
     ORDER BY p.created_at DESC`,
  );
  return rows;
}

export async function getRetailerEarnings(retailerId: string) {
  const { rows } = await pool.query<{
    week: string;
    month: string;
    all_time: string;
    delivered: string;
    pending: string;
  }>(
    `SELECT
       (SELECT COALESCE(SUM(p.amount), 0) FROM payments p
         JOIN orders o ON o.id = p.order_id
         WHERE o.retailer_id = $1 AND p.status = 'success'
           AND p.created_at >= date_trunc('week', now()))::int AS week,
       (SELECT COALESCE(SUM(p.amount), 0) FROM payments p
         JOIN orders o ON o.id = p.order_id
         WHERE o.retailer_id = $1 AND p.status = 'success'
           AND p.created_at >= date_trunc('month', now()))::int AS month,
       (SELECT COALESCE(SUM(p.amount), 0) FROM payments p
         JOIN orders o ON o.id = p.order_id
         WHERE o.retailer_id = $1 AND p.status = 'success')::int AS all_time,
       (SELECT COUNT(*) FROM orders
         WHERE retailer_id = $1 AND status = 'delivered')::int AS delivered,
       (SELECT COUNT(*) FROM payments p
         JOIN orders o ON o.id = p.order_id
         WHERE o.retailer_id = $1 AND p.status = 'pending')::int AS pending`,
    [retailerId],
  );
  const row = rows[0];
  return {
    week: Number(row?.week ?? 0),
    month: Number(row?.month ?? 0),
    allTime: Number(row?.all_time ?? 0),
    delivered: Number(row?.delivered ?? 0),
    pending: Number(row?.pending ?? 0),
  };
}

// Revenue per day for the trend chart. `scope` of null = platform-wide.
export async function getRevenueByDay(
  days: number,
  retailerId?: string,
): Promise<Array<{ day: string; revenue: number; orders: number }>> {
  const { rows } = await pool.query<{ day: string; revenue: string; orders: string }>(
    `SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
            COALESCE(SUM(o.total_amount) FILTER (WHERE o.status <> 'cancelled'), 0)::int AS revenue,
            COUNT(o.id)::int AS orders
     FROM generate_series(current_date - ($1::int - 1), current_date, interval '1 day') AS d(day)
     LEFT JOIN orders o ON o.created_at::date = d.day
       AND o.status <> 'cancelled'
       ${retailerId ? "AND o.retailer_id = $2" : ""}
     GROUP BY d.day
     ORDER BY d.day ASC`,
    retailerId ? [days, retailerId] : [days],
  );
  return rows.map((r) => ({
    day: r.day,
    revenue: Number(r.revenue),
    orders: Number(r.orders),
  }));
}

// --- Checkout / charge lifecycle writes --------------------------------
// createPayment takes an optional transaction-aware `client` since it
// must run inside placeOrderAction's order+items+payment transaction
// (lib/actions/checkout.ts) — every other write here runs against the
// module-level pool since it's a standalone statement.

export async function createPayment(
  input: {
    orderId: string;
    method: PaymentMethod;
    amount: number;
    providerRef: string;
  },
  client: PoolClient | typeof pool = pool,
): Promise<{ id: string }> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO payments (order_id, method, status, provider_ref, amount)
     VALUES ($1, $2, 'pending', $3, $4)
     RETURNING id`,
    [input.orderId, input.method, input.providerRef, input.amount],
  );
  return rows[0];
}

export async function updatePaymentProviderAttempt(
  paymentId: string,
  input: {
    provider: PaymentProvider;
    providerTransactionId: string | null;
    status?: PaymentStatus;
  },
): Promise<void> {
  await pool.query(
    `UPDATE payments
     SET provider = $1, provider_transaction_id = $2,
         status = COALESCE($3, status), updated_at = now()
     WHERE id = $4`,
    [input.provider, input.providerTransactionId, input.status ?? null, paymentId],
  );
}

// Idempotent by construction — a repeat webhook delivery, or a poll tick
// racing a webhook, for an already-resolved payment is a silent no-op
// rather than a double-write.
export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
): Promise<void> {
  await pool.query(
    `UPDATE payments SET status = $1, updated_at = now()
     WHERE id = $2 AND status = 'pending'`,
    [status, paymentId],
  );
}

export async function getPaymentByProviderRef(
  providerRef: string,
): Promise<{ id: string; order_id: string; status: PaymentStatus } | null> {
  const { rows } = await pool.query<{ id: string; order_id: string; status: PaymentStatus }>(
    "SELECT id, order_id, status FROM payments WHERE provider_ref = $1",
    [providerRef],
  );
  return rows[0] ?? null;
}

export async function getLatestPaymentForOrder(
  orderId: string,
): Promise<PaymentListItem | null> {
  const { rows } = await pool.query<PaymentListItem>(
    `SELECT id, order_id, method, status, provider, provider_ref, amount, created_at
     FROM payments WHERE order_id = $1
     ORDER BY created_at DESC LIMIT 1`,
    [orderId],
  );
  return rows[0] ?? null;
}
