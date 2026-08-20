import { pool } from "@/lib/db/pool";
import type { OrderStatus } from "@/types/db";
export { formatFcfa } from "@/lib/format";

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

export async function getOrdersByAgent(
  agentId: string,
  limit = 100,
): Promise<OrderListItem[]> {
  // order_assignments only ever holds the current assignment for an order
  // (assignOrderToAgent replaces rather than appends), so this can't
  // double-count an order across reassignments.
  const { rows } = await pool.query<OrderListItem>(
    `${ORDER_LIST_SELECT}
     JOIN order_assignments oa ON oa.order_id = o.id
     WHERE oa.agent_id = $1
     ORDER BY o.created_at DESC
     LIMIT $2`,
    [agentId, limit],
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
    spent: string;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM orders WHERE customer_id = $1 AND status NOT IN ('delivered','cancelled','failed'))::int AS active,
       (SELECT COUNT(*) FROM orders WHERE customer_id = $1 AND status = 'delivered')::int AS delivered,
       (SELECT COUNT(*) FROM addresses WHERE customer_id = $1)::int AS addresses,
       (SELECT COALESCE(SUM(total_amount), 0) FROM orders
         WHERE customer_id = $1 AND status = 'delivered')::int AS spent`,
    [customerId],
  );
  const row = rows[0];
  return {
    active: Number(row?.active ?? 0),
    delivered: Number(row?.delivered ?? 0),
    addresses: Number(row?.addresses ?? 0),
    spent: Number(row?.spent ?? 0),
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

export async function getAgentStats(agentId: string) {
  const { rows } = await pool.query<{
    active: string;
    delivered_today: string;
    delivered_total: string;
    failed: string;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM order_assignments
         WHERE agent_id = $1 AND status = 'assigned')::int AS active,
       (SELECT COUNT(*) FROM order_assignments oa
         JOIN orders o ON o.id = oa.order_id
         WHERE oa.agent_id = $1 AND oa.status = 'delivered'
           AND o.updated_at::date = current_date)::int AS delivered_today,
       (SELECT COUNT(*) FROM order_assignments
         WHERE agent_id = $1 AND status = 'delivered')::int AS delivered_total,
       (SELECT COUNT(*) FROM order_assignments
         WHERE agent_id = $1 AND status = 'failed')::int AS failed`,
    [agentId],
  );
  const row = rows[0];
  return {
    active: Number(row?.active ?? 0),
    deliveredToday: Number(row?.delivered_today ?? 0),
    deliveredTotal: Number(row?.delivered_total ?? 0),
    failed: Number(row?.failed ?? 0),
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

export async function countOrdersByStatus(
  retailerId: string,
  status: OrderStatus,
): Promise<number> {
  const { rows } = await pool.query<{ n: string }>(
    `SELECT COUNT(*)::int AS n FROM orders WHERE retailer_id = $1 AND status = $2`,
    [retailerId, status],
  );
  return Number(rows[0].n);
}

export async function getLatestActiveOrder(
  customerId: string,
): Promise<OrderListItem | null> {
  const { rows } = await pool.query<OrderListItem>(
    `${ORDER_LIST_SELECT}
     WHERE o.customer_id = $1 AND o.status IN ('placed','confirmed','assigned','out_for_delivery')
     ORDER BY o.created_at DESC
     LIMIT 1`,
    [customerId],
  );
  return rows[0] ?? null;
}

export type OrderDetail = {
  id: string;
  status: OrderStatus;
  payment_method: string;
  delivery_address: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  total_amount: number;
  cancelled_reason: string | null;
  created_at: Date;
  updated_at: Date;
  customer_name: string | null;
  business_name: string | null;
  retailer_location: string | null;
  items: Array<{
    product_id: string;
    brand: string;
    cylinder_size: string;
    quantity: number;
    price_at_order: number;
  }>;
  payment: {
    id: string;
    method: string;
    status: string;
    provider: string | null;
    provider_ref: string | null;
    failure_reason: string | null;
    amount: number;
  } | null;
  assignment: { agent_name: string; status: string } | null;
};

export async function getOrderById(orderId: string): Promise<OrderDetail | null> {
  const { rows } = await pool.query<Omit<OrderDetail, "items" | "payment" | "assignment">>(
    `SELECT o.id, o.status, o.payment_method, o.delivery_address,
            o.delivery_latitude, o.delivery_longitude, o.total_amount,
            o.cancelled_reason, o.created_at, o.updated_at,
            c.full_name AS customer_name,
            rt.business_name, rt.location AS retailer_location
     FROM orders o
     JOIN customers c ON c.user_id = o.customer_id
     JOIN retailers rt ON rt.id = o.retailer_id
     WHERE o.id = $1`,
    [orderId],
  );
  const order = rows[0];
  if (!order) return null;

  const [items, payment, assignment] = await Promise.all([
    pool.query<OrderDetail["items"][number]>(
      `SELECT oi.product_id, p.brand, p.cylinder_size, oi.quantity, oi.price_at_order
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1
       ORDER BY oi.product_id ASC`,
      [orderId],
    ),
    pool.query<NonNullable<OrderDetail["payment"]>>(
      // Retries insert a new row rather than mutating a failed one
      // (lib/actions/payments.ts), so this must take the latest attempt,
      // not an arbitrary one — a bare LIMIT 1 with no ORDER BY was only
      // safe while every order had at most one payment row.
      `SELECT id, method, status, provider, provider_ref, failure_reason, amount
       FROM payments WHERE order_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [orderId],
    ),
    pool.query<NonNullable<OrderDetail["assignment"]>>(
      `SELECT da.name AS agent_name, oa.status
       FROM order_assignments oa
       JOIN delivery_agents da ON da.id = oa.agent_id
       WHERE oa.order_id = $1 LIMIT 1`,
      [orderId],
    ),
  ]);

  return {
    ...order,
    items: items.rows,
    payment: payment.rows[0] ?? null,
    assignment: assignment.rows[0] ?? null,
  };
}
