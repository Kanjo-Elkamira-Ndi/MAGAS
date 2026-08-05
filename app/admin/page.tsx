import { Package, Store, Users } from "lucide-react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { EmptyState, StatCard } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireRole } from "@/lib/auth/session";
import {
  formatFcfa,
  getLatestOrders,
  getPlatformStats,
} from "@/lib/db/queries/orders";
import { getApprovedRetailers } from "@/lib/db/queries/retailers";

const NAV = [{ href: "/admin", label: "Overview" }];

export default async function AdminDashboardPage() {
  const session = await requireRole("admin");
  const email = session.user.email ?? "there";

  const [stats, orders, retailers] = await Promise.all([
    getPlatformStats(),
    getLatestOrders(5),
    getApprovedRetailers(),
  ]);

  return (
    <DashboardShell
      user={{
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        role: session.user.role ?? "admin",
      }}
      nav={NAV}
    >
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {email}. Live platform metrics across every retailer.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Customers" value={String(stats.customers)} />
          <StatCard label="Retailers" value={String(stats.retailers)} />
          <StatCard label="Orders" value={String(stats.orders)} />
          <StatCard
            label="Revenue"
            value={formatFcfa(stats.revenue)}
            tone="primary"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Latest orders</h2>
              {orders.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {orders.length} most recent
                </span>
              )}
            </div>

            {orders.length === 0 ? (
              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
                      <th className="px-4 py-3 font-medium">Order</th>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={4} className="px-4 py-12">
                        <EmptyState
                          className="border-0"
                          icon={<Package aria-hidden="true" className="size-5" />}
                          title="No orders in the system yet"
                          description="Every order across all retailers streams here for platform-level monitoring."
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
                      <th className="px-4 py-3 font-medium">Order</th>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-4 py-3.5 font-medium">
                          #{order.id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm">{order.customer_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.business_name} ·{" "}
                            {new Date(order.created_at).toLocaleString(
                              "en-GB",
                              {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold">
                          {formatFcfa(order.total_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/40 px-4 py-3">
              <span className="text-xs text-muted-foreground">
                Full lifecycle:
              </span>
              <StatusBadge status="placed" />
              <StatusBadge status="confirmed" />
              <StatusBadge status="assigned" />
              <StatusBadge status="out_for_delivery" />
              <StatusBadge status="delivered" />
              <StatusBadge status="failed" />
              <StatusBadge status="cancelled" />
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold">Approved retailers</h2>
            {retailers.length === 0 ? (
              <EmptyState
                icon={<Store aria-hidden="true" className="size-5" />}
                title="No retailers yet"
                description="Retailer sign-ups and onboarding approvals will appear here."
              />
            ) : (
              <div className="overflow-hidden rounded-xl border">
                <ul className="divide-y">
                  {retailers.map((retailer) => (
                    <li key={retailer.id} className="px-4 py-3.5">
                      <p className="text-sm font-medium">
                        {retailer.business_name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {retailer.location} · {retailer.orders} orders
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <EmptyState
              className="border-muted"
              icon={<Users aria-hidden="true" className="size-5" />}
              title="System status"
              description="Payment stubs (MoMo / Orange) and order state machine are wired — full flows land in Phase 1."
            />
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
