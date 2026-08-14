"use server";

// Delivery-agent-facing server actions. Kept out of lib/actions/dashboard.ts
// on purpose: this file is where the (agent)/api-agent surface — flagged in
// context/code-standards.md as needing an explicit callout — actually lives,
// and it's the one action file with an entry point (activateAgentAccountAction)
// that must work before the caller has a session.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { pool } from "@/lib/db/pool";
import {
  findValidVerificationToken,
  markTokenUsed,
} from "@/lib/db/queries/verification-tokens";
import {
  activateAgentAccount,
  updateAgentLocation,
} from "@/lib/db/queries/delivery-agents";
import {
  markDelivered,
  markFailed,
  markOutForDelivery,
} from "@/lib/orders/order-actions";

const orderIdSchema = z.string().uuid();
const coordsSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

function roleError(): never {
  throw new Error("You are not allowed to perform this action.");
}

// ---------------------------------------------------------------------------
// Invite acceptance (no session — runs before the agent has logged in)
// ---------------------------------------------------------------------------

const activateSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function activateAgentAccountAction(
  token: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = activateSchema.safeParse({ token, password });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const row = await findValidVerificationToken(parsed.data.token, "agent_invite");
  if (!row || !row.user_id) {
    return { ok: false, error: "This invite link is invalid or has expired." };
  }

  const hash = await hashPassword(parsed.data.password);
  await activateAgentAccount(row.user_id, hash);
  await markTokenUsed(row.id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Delivery status updates (agent self-service, own assignments only)
// ---------------------------------------------------------------------------

async function requireOwnAssignment(orderId: string): Promise<void> {
  const session = await getSession();
  const agentId = session?.user?.role === "agent" ? session.user.agentId : null;
  if (!agentId) roleError();

  const { rows } = await pool.query<{ agent_id: string }>(
    `SELECT agent_id FROM order_assignments
     WHERE order_id = $1 AND status = 'assigned'`,
    [orderId],
  );
  if (rows[0]?.agent_id !== agentId) roleError();
}

function revalidateAgentOrderPaths(orderId: string) {
  revalidatePath("/agent");
  revalidatePath("/agent/orders");
  revalidatePath(`/agent/order/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/customer/orders");
}

export async function agentMarkOutForDeliveryAction(orderId: string) {
  const id = orderIdSchema.parse(orderId);
  await requireOwnAssignment(id);
  await markOutForDelivery(id);
  revalidateAgentOrderPaths(id);
}

export async function agentMarkDeliveredAction(orderId: string) {
  const id = orderIdSchema.parse(orderId);
  await requireOwnAssignment(id);
  await markDelivered(id);
  revalidateAgentOrderPaths(id);
  revalidatePath("/admin/payments");
  revalidatePath("/retailer/earnings");
}

export async function agentMarkFailedAction(orderId: string) {
  const id = orderIdSchema.parse(orderId);
  await requireOwnAssignment(id);
  await markFailed(id);
  revalidateAgentOrderPaths(id);
}

// ---------------------------------------------------------------------------
// Live position (delivery tracking, agent self-service)
// ---------------------------------------------------------------------------

// This is a property of the agent, not of a specific order — no
// requireOwnAssignment(orderId) here, since a watchPosition callback has no
// order context handy, and no revalidatePath, since it fires every ~15s
// from the browser and isn't rendered server-side (the customer's map polls
// a separate read action instead).
export async function updateAgentLocationAction(input: {
  latitude: number;
  longitude: number;
}) {
  const session = await getSession();
  const agentId = session?.user?.role === "agent" ? session.user.agentId : null;
  if (!agentId) roleError();

  const { latitude, longitude } = coordsSchema.parse(input);
  await updateAgentLocation(agentId, latitude, longitude);
}
