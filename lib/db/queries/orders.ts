import { pool } from "@/lib/db/pool";
import type { OrderStatus } from "@/types/db";

// Order queries powering the customer / retailer / admin dashboards.
// All parameterized; the status state machine stays in lib/orders/status.ts.

export type OrderRow = {
  id: string;
  customer_id: string;
  retailer_id: string;
  status: OrderStatus;
  payment_method: "cod" | "momo" | "orange";
  delivery_address: string;
  total_amount: number;
  created_at: Date;
  updated_at: Date;
};

export type OrderListItem = {
  id: string;
  status: OrderStatus;
  payment_method: string;
  delivery_address: string;
  total_amount: number;
  created_at: Date;
  customer_name: string | null;
  business_name: string | null;
  items: number;
};

const ORDER_LIST_SELECT = `
  SELECT o.id, o.status, o.payment_method, o.delivery_address,
         o.total_amount, o.created_at,
         c.full_name AS customer_name,
         rt.business_name,
         (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id)::int AS items
  FROM orders o
  JOIN customers c ON c.user_id = o.customer_id
  JOIN retailers rt ON rt.id = o.retailer_id
`;

export async function getOrdersByCustomer(
  customerId: string,
  limit = 10,
): Promise<OrderListItem[]> {
  const { rows } = await pool.query<OrderListItem>(
    `${ORDER_LIST_SELECT}
     WHERE o.customer_id = $1
     ORDER BY o.created_at DESC
     LIMIT $2`,
    [customerId, limit],
  );
  return rows;
}

export async function getOrdersByRetailer(
  retailerId: string,
  limit = 10,
): Promise<OrderListItem[]> {
  const { rows } = await pool.query<OrderListItem>(
    `${ORDER_LIST_SELECT}
     WHERE o.retailer_id = $1
     ORDER BY o.created_at DESC
     LIMIT $2`,
    [retailerId, limit],
  );
  return rows;
}

export async function getLatestOrders(limit = 10): Promise<OrderListItem[]> {
  const { rows } = await pool.query<OrderListItem>(
    `${ORDER_LIST_SELECT}
     ORDER BY o.created_at DESC
     LIMIT $1`,
    [limit],
  );
  return rows;
}

export async function getCustomerStats(customerId: string) {
  const { rows } = await pool.query<{
    active: string;
    delivered: string;
    addresses: string;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM orders WHERE customer_id = $1 AND status NOT IN ('delivered','cancelled','failed'))::int AS active,
       (SELECT COUNT(*) FROM orders WHERE customer_id = $1 AND status = 'delivered')::int AS delivered,
       (SELECT COUNT(*) FROM addresses WHERE customer_id = $1)::int AS addresses`,
    [customerId],
  );
  const row = rows[0];
  return {
    active: Number(row?.active ?? 0),
    delivered: Number(row?.delivered ?? 0),
    addresses: Number(row?.addresses ?? 0),
  };
}

export async function getRetailerStats(retailerId: string) {
  const { rows } = await pool.query<{
    today: string;
    pending: string;
    out_for_delivery: string;
    revenue_today: string;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM orders
         WHERE retailer_id = $1 AND created_at::date = current_date)::int AS today,
       (SELECT COUNT(*) FROM orders
         WHERE retailer_id = $1 AND status = 'placed')::int AS pending,
       (SELECT COUNT(*) FROM orders
         WHERE retailer_id = $1 AND status = 'out_for_delivery')::int AS out_for_delivery,
       (SELECT COALESCE(SUM(total_amount), 0) FROM orders
         WHERE retailer_id = $1 AND created_at::date = current_date AND status <> 'cancelled')::int AS revenue_today`,
    [retailerId],
  );
  const row = rows[0];
  return {
    today: Number(row?.today ?? 0),
    pending: Number(row?.pending ?? 0),
    outForDelivery: Number(row?.out_for_delivery ?? 0),
    revenueToday: Number(row?.revenue_today ?? 0),
  };
}

export async function getPlatformStats() {
  const { rows } = await pool.query<{
    customers: string;
    retailers: string;
    orders: string;
    revenue: string;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE role = 'customer')::int AS customers,
       (SELECT COUNT(*) FROM retailers WHERE status = 'approved')::int AS retailers,
       (SELECT COUNT(*) FROM orders)::int AS orders,
       (SELECT COALESCE(SUM(total_amount), 0) FROM orders
         WHERE status <> 'cancelled')::int AS revenue`,
  );
  const row = rows[0];
  return {
    customers: Number(row?.customers ?? 0),
    retailers: Number(row?.retailers ?? 0),
    orders: Number(row?.orders ?? 0),
    revenue: Number(row?.revenue ?? 0),
  };
}

// Simple money formatter shared by dashboards (XAF has no subunit).
export function formatFcfa(amount: number): string {
  return `${amount.toLocaleString("en-US")} FCFA`;
}
