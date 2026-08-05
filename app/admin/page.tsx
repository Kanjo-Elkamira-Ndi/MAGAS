import Link from "next/link";
import { ArrowRight, Check, Store, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { BarChart } from "@/components/dashboard/trend-chart";
import { OrdersDataTable } from "@/components/dashboard/orders-table";
import { requireRole } from "@/lib/auth/session";
import {
  formatFcfa,
  getLatestOrders,
  getPlatformStats,
} from "@/lib/db/queries/orders";
import { getRevenueByDay } from "@/lib/db/queries/payments";
import { getAllRetailers } from "@/lib/db/queries/retailers";
import { setRetailerStatusAction } from "@/lib/actions/dashboard";

export default async function AdminHomePage() {
  await requireRole("admin");

  const [stats, orders, retailers, trend] = await Promise.all([
    getPlatformStats(),
    getLatestOrders(10),
    getAllRetailers(),
    getRevenueByDay(14),
  ]);

  const pending = retailers.filter((r) => r.status === "pending");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Platform overview"
        description="Live metrics across every retailer, order and payment on MAGAS."
      >
        <Button asChild variant="outline">
          <Link href="/admin/retailers">
            <Store aria-hidden="true" className="size-4" />
            Manage retailers
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Customers" value={String(stats.customers)} hint="Active accounts" />
        <StatCard
          label="Retailers"
          value={String(stats.retailers)}
          hint={`${pending.length} awaiting approval`}
          tone={pending.length > 0 ? "warning" : "default"}
        />
        <StatCard label="Orders" value={String(stats.orders)} hint="All time" />
        <StatCard
          label="Revenue"
          value={formatFcfa(stats.revenue)}
          hint="Excl. cancelled"
          tone="primary"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Platform revenue — last 14 days</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/payments">
                Payments <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </Button>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <BarChart
              data={trend.map((t) => ({
                label: new Date(t.day + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
                value: t.revenue,
              }))}
              formatValue={(v) => formatFcfa(v)}
              height={180}
            />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Retailer approvals</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/retailers">
                View all <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </Button>
          </div>
          {pending.length === 0 ? (
            <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
              <Check aria-hidden="true" className="mb-2 size-4 text-success" />
              No retailers waiting — approval queue is clear.
            </div>
          ) : (
            <ul className="overflow-hidden rounded-xl border bg-card">
              {pending.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.business_name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.location} · {r.owner_email}
                    </p>
                  </div>
                  <form action={setRetailerStatusAction.bind(null, r.id, "approved")}>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Check aria-hidden="true" className="size-3.5" />
                      Approve
                    </Button>
                  </form>
                  <form action={setRetailerStatusAction.bind(null, r.id, "suspended")}>
                    <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground">
                      <X aria-hidden="true" className="size-3.5" />
                      Reject
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Latest orders</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/orders">
              All orders <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </Button>
        </div>
        <OrdersDataTable role="admin" data={orders} />
      </section>
    </div>
  );
}
