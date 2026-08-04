import { Package, Settings, UserPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { EmptyState, StatCard } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireRole } from "@/lib/auth/session";

const NAV = [{ href: "/retailer", label: "Overview" }];

export default async function RetailerDashboardPage() {
  const session = await requireRole("retailer");
  const email = session.user.email ?? "there";

  return (
    <DashboardShell
      user={{
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        role: session.user.role ?? "retailer",
      }}
      nav={NAV}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Shop overview</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Signed in as {email}. Orders from your neighbourhood appear here.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/retailer">
              <Settings aria-hidden="true" className="size-4" />
              Shop settings
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Orders today" value="0" />
          <StatCard label="Pending confirmation" value="0" tone="warning" />
          <StatCard label="Out for delivery" value="0" />
          <StatCard label="Revenue today" value="0 FCFA" tone="primary" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Recent orders</h2>
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
                        title="No orders yet"
                        description="New neighbourhood orders will land here with a status badge so you can act fast."
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/40 px-4 py-3">
              <span className="text-xs text-muted-foreground">
                Statuses you&apos;ll act on:
              </span>
              <StatusBadge status="placed" />
              <StatusBadge status="confirmed" />
              <StatusBadge status="out_for_delivery" />
              <StatusBadge status="failed" />
              <StatusBadge status="cancelled" />
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold">Delivery agents</h2>
            <EmptyState
              icon={<UserPlus aria-hidden="true" className="size-5" />}
              title="No agents linked yet"
              description="In Phase 1 you&apos;ll invite delivery agents to link to your shop and receive assignments."
              action={
                <Button asChild variant="outline">
                  <Link href="/retailer">Invite an agent</Link>
                </Button>
              }
            />
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
