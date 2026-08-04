import { LayoutDashboard, Package, Users } from "lucide-react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { EmptyState, StatCard } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireRole } from "@/lib/auth/session";

const NAV = [{ href: "/admin", label: "Overview" }];

export default async function AdminDashboardPage() {
  const session = await requireRole("admin");
  const email = session.user.email ?? "there";

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
            Signed in as {email}. Live platform metrics land here in Phase 1.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Customers" value="0" />
          <StatCard label="Retailers" value="0" />
          <StatCard label="Orders" value="0" />
          <StatCard label="Revenue" value="0 FCFA" tone="primary" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Latest orders</h2>
              <span className="text-xs text-muted-foreground">Phase 1</span>
            </div>
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
            <h2 className="text-sm font-semibold">Registrations</h2>
            <EmptyState
              icon={<Users aria-hidden="true" className="size-5" />}
              title="No retailers yet"
              description="Retailer sign-ups and onboarding approvals will appear here."
            />
            <EmptyState
              className="border-muted"
              icon={<LayoutDashboard aria-hidden="true" className="size-5" />}
              title="System status"
              description="Payment stubs (MoMo / Orange) and order state machine are wired — dashboards connect in Phase 1."
            />
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
