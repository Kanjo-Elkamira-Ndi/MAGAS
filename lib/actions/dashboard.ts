"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import {
  assignOrderToAgent,
  cancelOrder,
  confirmOrder,
  markDelivered,
  markFailed,
  markOutForDelivery,
} from "@/lib/orders/order-actions";
import { getOrderById } from "@/lib/db/queries/orders";
import {
  addAddress,
  deleteAddress,
  setDefaultAddress,
} from "@/lib/db/queries/addresses";
import {
  deleteProduct,
  setProductAvailability,
  upsertProduct,
} from "@/lib/db/queries/products";
import {
  createDeliveryAgent,
  deleteDeliveryAgent,
  listDeliveryAgents,
  updateDeliveryAgent,
} from "@/lib/db/queries/agents";
import { createAgentInvite } from "@/lib/db/queries/delivery-agents";
import { updateUserStatus } from "@/lib/db/queries/users";
import {
  updateRetailerLocation,
  updateRetailerStatus,
} from "@/lib/db/queries/retailers";
import { pool } from "@/lib/db/pool";
import type { UserStatus } from "@/types/db";

// Every mutation revalidates the affected routes so the server-rendered
// pages always reflect the change after router.refresh() on the client.

function roleError(): never {
  throw new Error("You are not allowed to perform this action.");
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export async function getOrderDetailAction(orderId: string) {
  const session = await getSession();
  if (!session?.user?.id) roleError();

  const order = await getOrderById(orderId);
  if (!order) return null;

  return {
    ...order,
    created_at: order.created_at.toISOString(),
    updated_at: order.updated_at.toISOString(),
    items: order.items,
    payment: order.payment,
    assignment: order.assignment,
  };
}

const orderIdSchema = z.string().uuid();

export async function confirmOrderAction(orderId: string) {
  const session = await getSession();
  const retailerId = session?.user?.retailerId;
  if (!retailerId) roleError();
  const id = orderIdSchema.parse(orderId);

  const { rows } = await pool.query<{ retailer_id: string }>(
    "SELECT retailer_id FROM orders WHERE id = $1",
    [id],
  );
  if (rows[0]?.retailer_id !== retailerId) roleError();

  await confirmOrder(id);
  revalidatePath("/retailer/orders");
  revalidatePath("/retailer");
  revalidatePath("/admin/orders");
  revalidatePath("/customer/orders");
}

export async function cancelOrderAction(orderId: string, reason?: string) {
  const session = await getSession();
  if (!session?.user?.id) roleError();
  const id = orderIdSchema.parse(orderId);

  const { rows } = await pool.query<{ customer_id: string; retailer_id: string }>(
    "SELECT customer_id, retailer_id FROM orders WHERE id = $1",
    [id],
  );
  const order = rows[0];
  if (!order) return;
  const role = session.user.role;
  const allowed =
    (role === "customer" && order.customer_id === session.user.customerId) ||
    (role === "retailer" && order.retailer_id === session.user.retailerId) ||
    role === "admin";
  if (!allowed) roleError();

  await cancelOrder(id, reason?.trim() || undefined);
  revalidatePath("/customer/orders");
  revalidatePath("/retailer/orders");
  revalidatePath("/admin/orders");
  revalidatePath("/customer");
  revalidatePath("/retailer");
}

export async function assignAgentAction(orderId: string, agentId: string) {
  const session = await getSession();
  if (session?.user?.role !== "admin") roleError();
  await assignOrderToAgent(orderIdSchema.parse(orderId), z.string().uuid().parse(agentId));
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

export async function markOutForDeliveryAction(orderId: string) {
  const session = await getSession();
  if (session?.user?.role !== "admin") roleError();
  await markOutForDelivery(orderIdSchema.parse(orderId));
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

export async function markDeliveredAction(orderId: string) {
  const session = await getSession();
  if (session?.user?.role !== "admin") roleError();
  await markDelivered(orderIdSchema.parse(orderId));
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/admin/payments");
  revalidatePath("/retailer/earnings");
}

export async function markFailedAction(orderId: string) {
  const session = await getSession();
  if (session?.user?.role !== "admin") roleError();
  await markFailed(orderIdSchema.parse(orderId));
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Products (retailer-scoped)
// ---------------------------------------------------------------------------

const productSchema = z.object({
  id: z.string().uuid().optional(),
  brand: z.string().trim().min(1, "Brand is required").max(100),
  cylinderSize: z.string().trim().min(1, "Size is required").max(20),
  price: z.coerce.number().int().positive("Price must be positive"),
  availability: z.boolean(),
});

export async function upsertProductAction(input: z.infer<typeof productSchema>) {
  const session = await getSession();
  const retailerId = session?.user?.retailerId;
  if (!retailerId) roleError();
  const data = productSchema.parse(input);

  await upsertProduct({ ...data, retailerId });
  revalidatePath("/retailer/products");
  revalidatePath("/admin/products");
  revalidatePath("/customer/retailers");
}

export async function toggleProductAction(productId: string, availability: boolean) {
  const session = await getSession();
  if (!session?.user) roleError();
  const id = orderIdSchema.parse(productId);

  if (session.user.role === "retailer") {
    const { rows } = await pool.query<{ retailer_id: string }>(
      "SELECT retailer_id FROM products WHERE id = $1",
      [id],
    );
    if (rows[0]?.retailer_id !== session.user.retailerId) roleError();
  } else if (session.user.role !== "admin") {
    roleError();
  }

  await setProductAvailability(id, availability);
  revalidatePath("/retailer/products");
  revalidatePath("/admin/products");
  revalidatePath("/customer/retailers");
}

export async function deleteProductAction(productId: string) {
  const session = await getSession();
  if (!session?.user) roleError();
  const id = orderIdSchema.parse(productId);

  if (session.user.role === "retailer") {
    await deleteProduct(id, session.user.retailerId ?? "");
  } else if (session.user.role === "admin") {
    await deleteProduct(id);
  } else {
    roleError();
  }
  revalidatePath("/retailer/products");
  revalidatePath("/admin/products");
}

// ---------------------------------------------------------------------------
// Retailer profile (retailer-scoped)
// ---------------------------------------------------------------------------

const retailerLocationSchema = z.object({
  location: z.string().trim().min(1, "Location is required").max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export async function updateRetailerLocationAction(
  input: z.infer<typeof retailerLocationSchema>,
) {
  const session = await getSession();
  const retailerId = session?.user?.retailerId;
  if (!retailerId) roleError();
  const data = retailerLocationSchema.parse(input);

  await updateRetailerLocation(retailerId, data);
  revalidatePath("/retailer/settings");
  revalidatePath("/customer/retailers");
}

// ---------------------------------------------------------------------------
// Addresses (customer-scoped)
// ---------------------------------------------------------------------------

const addressSchema = z.object({
  label: z.string().trim().max(60).optional().or(z.literal("")),
  line1: z.string().trim().min(3, "Address line is required").max(200),
  city: z.string().trim().min(1, "City is required").max(100),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
  // Set when the address came from Google Places Autocomplete. Optional —
  // a customer who types a manual address without picking a suggestion
  // still gets to submit; the address just won't have a map pin.
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export async function addAddressAction(input: z.infer<typeof addressSchema>) {
  const session = await getSession();
  const customerId = session?.user?.customerId;
  if (!customerId) roleError();
  const data = addressSchema.parse(input);

  const address = await addAddress(customerId, {
    label: data.label || undefined,
    line1: data.line1,
    city: data.city,
    notes: data.notes || undefined,
    latitude: data.latitude,
    longitude: data.longitude,
  });
  const count = (await pool.query(
    "SELECT COUNT(*)::int AS n FROM addresses WHERE customer_id = $1",
    [customerId],
  )).rows[0].n as number;
  if (count === 1) await setDefaultAddress(customerId, address.id);

  revalidatePath("/customer/addresses");
  revalidatePath("/customer");
}

export async function deleteAddressAction(addressId: string) {
  const session = await getSession();
  const customerId = session?.user?.customerId;
  if (!customerId) roleError();
  await deleteAddress(customerId, orderIdSchema.parse(addressId));
  revalidatePath("/customer/addresses");
  revalidatePath("/customer");
}

export async function setDefaultAddressAction(addressId: string) {
  const session = await getSession();
  const customerId = session?.user?.customerId;
  if (!customerId) roleError();
  await setDefaultAddress(customerId, orderIdSchema.parse(addressId));
  revalidatePath("/customer/addresses");
}

// ---------------------------------------------------------------------------
// Delivery agents (admin)
// ---------------------------------------------------------------------------

// Read helper for the order dialog (client components may not import the
// DB layer directly — server actions are the RPC boundary).
export async function listActiveAgentsAction() {
  const session = await getSession();
  if (!session?.user?.id) roleError();
  const agents = await listDeliveryAgents();
  return agents.filter((a) => a.status === "active");
}

const agentSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Name is required").max(100),
  phone: z.string().trim().min(6, "Phone number looks too short").max(30),
  status: z.enum(["active", "inactive"]),
});

export async function upsertAgentAction(input: z.infer<typeof agentSchema>) {
  const session = await getSession();
  if (session?.user?.role !== "admin") roleError();
  const data = agentSchema.parse(input);

  if (data.id) await updateDeliveryAgent(data.id, data);
  else await createDeliveryAgent(data);
  revalidatePath("/admin/agents");
}

export async function deleteAgentAction(agentId: string) {
  const session = await getSession();
  if (session?.user?.role !== "admin") roleError();
  await deleteDeliveryAgent(orderIdSchema.parse(agentId));
  revalidatePath("/admin/agents");
}

// Generates a set-password link for an agent contact record rather than
// emailing it — this app has no email-sending infra yet (register and
// password-reset are themselves still 501 stubs for the same reason), so
// the admin copies/shares the link manually.
export async function inviteAgentAction(agentId: string) {
  const session = await getSession();
  if (session?.user?.role !== "admin") roleError();
  const id = orderIdSchema.parse(agentId);

  const agents = await listDeliveryAgents();
  const agent = agents.find((a) => a.id === id);
  if (!agent) roleError();
  if (agent.login_status === "active") {
    throw new Error("This agent already has an active login.");
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await createAgentInvite(id, token, expiresAt);

  revalidatePath("/admin/agents");
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return { inviteUrl: `${base}/agent-invite/${token}` };
}

// ---------------------------------------------------------------------------
// Users / retailers (admin)
// ---------------------------------------------------------------------------

export async function setUserStatusAction(userId: string, status: UserStatus) {
  const session = await getSession();
  if (session?.user?.role !== "admin") roleError();
  if (session.user.id === userId) roleError();
  await updateUserStatus(orderIdSchema.parse(userId), status);
  revalidatePath("/admin/users");
}

export async function setRetailerStatusAction(
  retailerId: string,
  status: "approved" | "suspended",
) {
  const session = await getSession();
  if (session?.user?.role !== "admin") roleError();
  await updateRetailerStatus(orderIdSchema.parse(retailerId), status, session.user.id);
  revalidatePath("/admin/retailers");
  revalidatePath("/admin");
  revalidatePath("/customer/retailers");
  revalidatePath("/admin/products");
}

// ---------------------------------------------------------------------------
// Payments (admin reconcile of COD)
// ---------------------------------------------------------------------------

export async function reconcilePaymentAction(paymentId: string) {
  const session = await getSession();
  if (session?.user?.role !== "admin") roleError();
  // COD-only, and only from pending — the UI already only renders this
  // button for that case, but with real NotchPay/Fapshi money now
  // flowing through this table, the server must enforce it too: without
  // this guard, a crafted/replayed request against a real momo/orange
  // payment id could fabricate a "success" on money that never arrived.
  await pool.query(
    `UPDATE payments SET status = 'success', updated_at = now()
     WHERE id = $1 AND method = 'cod' AND status = 'pending'`,
    [orderIdSchema.parse(paymentId)],
  );
  revalidatePath("/admin/payments");
  revalidatePath("/retailer/earnings");
}
