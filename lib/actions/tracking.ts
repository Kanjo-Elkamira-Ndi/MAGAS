"use server";

// Live delivery tracking, read side. Kept out of lib/actions/dashboard.ts
// on purpose: this action is polled from the customer's order page every
// ~15s (components/dashboard/delivery-map.tsx), a much higher-frequency
// usage pattern than anything else in that file — same reasoning that
// split lib/actions/agent.ts out in the first place.

import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { pool } from "@/lib/db/pool";
import {
  getAgentLocationForOrder,
  type AgentLocation,
} from "@/lib/db/queries/delivery-agents";

const orderIdSchema = z.string().uuid();

function roleError(): never {
  throw new Error("You are not allowed to perform this action.");
}

export async function getAgentLocationAction(
  orderId: string,
): Promise<AgentLocation | null> {
  const session = await getSession();
  if (!session?.user?.id) roleError();
  const id = orderIdSchema.parse(orderId);

  const { rows } = await pool.query<{ customer_id: string; status: string }>(
    "SELECT customer_id, status FROM orders WHERE id = $1",
    [id],
  );
  const order = rows[0];
  if (!order) return null;

  const role = session.user.role;
  const allowed =
    (role === "customer" && order.customer_id === session.user.customerId) ||
    role === "admin";
  if (!allowed) roleError();

  // Only meaningful once the order is actually on its way — matches the
  // status OrderTimeline treats as "out for delivery" everywhere else.
  if (order.status !== "out_for_delivery") return null;

  return getAgentLocationForOrder(id);
}
