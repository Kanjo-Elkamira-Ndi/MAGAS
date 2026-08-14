import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderTimeline } from "@/components/dashboard/order-timeline";
import { StatusBadge } from "@/components/shared/status-badge";
import { CancelOrderButton } from "@/components/dashboard/cancel-order-button";
import { DeliveryMap } from "@/components/dashboard/delivery-map";
import { requireRole } from "@/lib/auth/session";
import { formatFcfa, getOrderById } from "@/lib/db/queries/orders";
import { pool } from "@/lib/db/pool";
import type { PaymentMethod } from "@/types/db";

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cod: "Cash on delivery",
  momo: "MoMo",
  orange: "Orange Money",
};

export default async function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const session = await requireRole("customer");
  const customerId = session.user.customerId ?? "";
  const { orderId } = await params;

  const order = await getOrderById(orderId);
  if (!order) notFound();

  const owned = await getOwnershipCheck(orderId, customerId);
  if (!owned) notFound();

  const cancellable = order.status === "placed" || order.status === "confirmed";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/customer/orders">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to orders
          </Link>
        </Button>
        {cancellable && <CancelOrderButton orderId={order.id} />}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight">
          Order #{order.id.slice(0, 8).toUpperCase()}
        </h1>
        <StatusBadge status={order.status} />
      </div>

      <OrderTimeline status={order.status} />

      {order.status === "cancelled" && order.cancelled_reason && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Cancellation reason: {order.cancelled_reason}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Items</h2>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {order.items.map((item) => (
              <li key={item.product_id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {item.brand} · {item.cylinder_size}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} × {formatFcfa(item.price_at_order)}
                  </p>
                </div>
                <span className="text-sm font-semibold">
                  {formatFcfa(item.price_at_order * item.quantity)}
                </span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 bg-muted/40 px-4 py-3">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-base font-bold">{formatFcfa(order.total_amount)}</span>
            </li>
          </ul>
        </section>

        <aside className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">Details</h2>
            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin aria-hidden="true" className="size-3.5" />
                  Retailer
                </dt>
                <dd className="mt-0.5 font-medium">{order.business_name ?? "—"}</dd>
                <dd className="text-xs text-muted-foreground">{order.retailer_location}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Wallet aria-hidden="true" className="size-3.5" />
                  Payment
                </dt>
                <dd className="mt-0.5 font-medium capitalize">
                  {PAYMENT_LABEL[order.payment_method as PaymentMethod]}
                </dd>
                {order.payment && (
                  <dd className="text-xs text-muted-foreground capitalize">
                    {order.payment.status}
                    {order.payment.provider_ref ? ` · ${order.payment.provider_ref}` : ""}
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Delivery address</dt>
                <dd className="mt-0.5 font-medium">{order.delivery_address}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Placed</dt>
                <dd className="mt-0.5 font-medium">
                  {new Date(order.created_at).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
            </dl>
          </div>

          {order.status === "out_for_delivery" && (
            <DeliveryMap
              orderId={order.id}
              destination={
                order.delivery_latitude !== null && order.delivery_longitude !== null
                  ? { lat: order.delivery_latitude, lng: order.delivery_longitude }
                  : null
              }
            />
          )}
        </aside>
      </div>
    </div>
  );
}

async function getOwnershipCheck(orderId: string, customerId: string) {
  const { rows } = await pool.query<{ n: string }>(
    "SELECT COUNT(*)::int AS n FROM orders WHERE id = $1 AND customer_id = $2",
    [orderId, customerId],
  );
  return Number(rows[0].n) > 0;
}
