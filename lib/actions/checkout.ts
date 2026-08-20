"use server";

import { randomUUID } from "node:crypto";
import { getSession } from "@/lib/auth/session";
import { pool } from "@/lib/db/pool";
import { getProductById } from "@/lib/db/queries/products";
import { createPayment, updatePaymentProviderAttempt } from "@/lib/db/queries/payments";
import { chargeOrder } from "@/lib/payments/charge";
import { checkoutSchema, type CheckoutInput } from "@/lib/validation/checkout";
import type { ChargeInitiationResult } from "@/lib/payments/types";

function roleError(): never {
  throw new Error("You are not allowed to perform this action.");
}

export async function placeOrderAction(
  input: CheckoutInput,
): Promise<{ orderId: string; chargeResult: ChargeInitiationResult | null }> {
  const session = await getSession();
  const customerId = session?.user?.customerId;
  if (!customerId) roleError();

  const data = checkoutSchema.parse(input);

  const addressResult = await pool.query<{
    line1: string;
    city: string;
    latitude: number | null;
    longitude: number | null;
  }>(
    "SELECT line1, city, latitude, longitude FROM addresses WHERE id = $1 AND customer_id = $2",
    [data.addressId, customerId],
  );
  const address = addressResult.rows[0];
  if (!address) roleError();

  // Re-fetch every product server-side and use the server price — never
  // a client-supplied one. Also verify each belongs to the given
  // retailer and is currently in stock. The checkout analog of "no
  // client-writable status" (context/security.md).
  let totalAmount = 0;
  const itemsWithPrice: Array<{ productId: string; quantity: number; price: number }> = [];
  for (const item of data.items) {
    const product = await getProductById(item.productId);
    if (!product || product.retailer_id !== data.retailerId || !product.availability) {
      throw new Error("One of the selected products is no longer available.");
    }
    totalAmount += product.price * item.quantity;
    itemsWithPrice.push({
      productId: item.productId,
      quantity: item.quantity,
      price: product.price,
    });
  }

  const deliveryAddress = `${address.line1}, ${address.city}`;
  // Generated once, before any provider is contacted, and stored on the
  // payments row inside the same transaction that creates it — a webhook
  // arriving early can still be matched by this reference. Reused as-is
  // if the primary provider fails over to the fallback.
  const providerRef = randomUUID();

  // First real app-level transaction in this codebase outside
  // lib/db/migrate.ts — every other multi-statement write elsewhere is
  // unwrapped sequential pool.query calls, which is fine until this
  // exact case: a partial order/items/payment write here is real
  // financial-data corruption, not just a UI glitch.
  const client = await pool.connect();
  let orderId: string;
  let paymentId: string;
  try {
    await client.query("BEGIN");

    const orderResult = await client.query<{ id: string }>(
      `INSERT INTO orders (customer_id, retailer_id, status, payment_method, delivery_address, delivery_latitude, delivery_longitude, total_amount)
       VALUES ($1, $2, 'placed', $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        customerId,
        data.retailerId,
        data.paymentMethod,
        deliveryAddress,
        address.latitude,
        address.longitude,
        totalAmount,
      ],
    );
    orderId = orderResult.rows[0].id;

    for (const item of itemsWithPrice) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price_at_order)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.productId, item.quantity, item.price],
      );
    }

    const payment = await createPayment(
      { orderId, method: data.paymentMethod, amount: totalAmount, providerRef },
      client,
    );
    paymentId = payment.id;

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  if (data.paymentMethod === "cod") {
    return { orderId, chargeResult: null };
  }

  // Never hold a DB transaction open across a slow external HTTP call —
  // charge initiation happens strictly after commit.
  const chargeResult = await chargeOrder({
    orderId,
    method: data.paymentMethod,
    amount: totalAmount,
    phone: data.phone!,
    providerRef,
  });

  if (chargeResult.kind === "failed") {
    console.error(
      `[payments] charge declined for order ${orderId} via ${chargeResult.provider}: ${chargeResult.message}`,
    );
  }

  await updatePaymentProviderAttempt(paymentId, {
    provider: chargeResult.provider,
    providerTransactionId: chargeResult.kind === "failed" ? null : chargeResult.providerTransactionId,
    status: chargeResult.kind === "failed" ? "failed" : undefined,
    failureReason: chargeResult.kind === "failed" ? chargeResult.message : undefined,
  });

  return { orderId, chargeResult };
}
