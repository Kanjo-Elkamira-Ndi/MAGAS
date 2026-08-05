import { pool } from "@/lib/db/pool";
import type { PaymentStatus, PaymentMethod } from "@/types/db";

export type PaymentListItem = {
  id: string;
  order_id: string;
  method: PaymentMethod;
  status: PaymentStatus;
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
    `SELECT p.id, p.order_id, p.method, p.status, p.provider_ref, p.amount, p.created_at,
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
    `SELECT p.id, p.order_id, p.method, p.status, p.provider_ref, p.amount, p.created_at,
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
