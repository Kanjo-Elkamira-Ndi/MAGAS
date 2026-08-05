import { Flame, MapPin, Package, Truck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { EmptyState, StatCard } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireRole } from "@/lib/auth/session";
import {
  formatFcfa,
  getCustomerStats,
  getOrdersByCustomer,
} from "@/lib/db/queries/orders";

const NAV = [{ href: "/customer", label: "Overview" }];

export default async function CustomerDashboardPage() {
  const session = await requireRole("customer");
  const email = session.user.email ?? "there";
  const customerId = session.user.customerId;

  const [stats, orders] = await Promise.all([
    getCustomerStats(customerId ?? ""),
    getOrdersByCustomer(customerId ?? "", 4),
  ]);

  return (
    <DashboardShell
      user={{
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        role: session.user.role ?? "customer",
      }}
      nav={NAV}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back{email ? `, ${email}` : ""}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Here&apos;s what&apos;s happening with your gas.
            </p>
          </div>
          <Button asChild>
            <Link href="/register">
              <Flame aria-hidden="true" className="size-4" />
              Order a cylinder
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Active orders"
            value={String(stats.active)}
            hint={stats.active > 0 ? "In transit" : "Nothing in transit"}
          />
          <StatCard
            label="Delivered"
            value={String(stats.delivered)}
            hint="Lifetime orders"
          />
          <StatCard
            label="Saved addresses"
            value={String(stats.addresses)}
            hint="Add one when you order"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Recent orders</h2>
              {orders.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {orders.length} most recent
                </span>
              )}
            </div>

            {orders.length === 0 ? (
              <EmptyState
                icon={<Package aria-hidden="true" className="size-5" />}
                title="No orders yet"
                description="When you place your first order, it will show up here with live status tracking."
                action={
                  <Button asChild variant="outline">
                    <Link href="/register">Order your first cylinder</Link>
                  </Button>
                }
              />
            ) : (
              <div className="overflow-hidden rounded-xl border">
                <ul className="divide-y">
                  {orders.map((order) => (
                    <li
                      key={order.id}
                      className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {order.business_name} ·{" "}
                          {order.items} item{order.items === 1 ? "" : "s"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString(
                            "en-GB",
                            { day: "numeric", month: "short" },
                          )}{" "}
                          · {order.payment_method.toUpperCase()} ·{" "}
                          {order.delivery_address}
                        </p>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatFcfa(order.total_amount)}
                      </span>
                      <StatusBadge status={order.status} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/40 px-4 py-3">
              <span className="text-xs text-muted-foreground">
                Order statuses you&apos;ll see:
              </span>
              <StatusBadge status="placed" />
              <StatusBadge status="confirmed" />
              <StatusBadge status="out_for_delivery" />
              <StatusBadge status="delivered" />
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold">How delivery works</h2>
            <ol className="space-y-3">
              {[
                { icon: MapPin, title: "1. Choose your area", text: "Find retailers near you with live prices." },
                { icon: Flame, title: "2. Pick your cylinder", text: "Size, quantity, and payment method." },
                { icon: Truck, title: "3. Track to your door", text: "Live status until it arrives." },
              ].map((step) => (
                <li
                  key={step.title}
                  className="flex items-start gap-3 rounded-xl border bg-card p-4"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <step.icon aria-hidden="true" className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
