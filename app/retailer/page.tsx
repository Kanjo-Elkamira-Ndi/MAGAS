import Link from "next/link";
import { ArrowRight, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { BarChart } from "@/components/dashboard/trend-chart";
import { PendingOrderList, OrdersDataTable } from "@/components/dashboard/orders-table";
import { requireRole } from "@/lib/auth/session";
import {
  formatFcfa,
  getOrdersByRetailer,
  getRetailerStats,
} from "@/lib/db/queries/orders";
import { getRevenueByDay } from "@/lib/db/queries/payments";

export default async function RetailerHomePage() {
  const session = await requireRole("retailer");
  const retailerId = session.user.retailerId ?? "";
  const name = session.user.name ?? session.user.email ?? "your shop";

  const [stats, orders, trend] = await Promise.all([
    getRetailerStats(retailerId),
    getOrdersByRetailer(retailerId, 12),
    getRevenueByDay(14, retailerId),
  ]);

  const pending = orders.filter((o) => o.status === "placed");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${name} — shop overview`}
        description="Orders from your neighbourhood appear here. Act fast on pending ones."
      >
        <Button asChild variant="outline">
          <Link href="/retailer/products">
            <Plus aria-hidden="true" className="size-4" />
            Add product
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Orders today"
          value={String(stats.today)}
          hint="Placed today"
          icon={<Package aria-hidden="true" className="size-4" />}
        />
        <StatCard
          label="Pending confirmation"
          value={String(stats.pending)}
          hint="Need your action"
          icon={<ArrowRight aria-hidden="true" className="size-4" />}
          tone="warning"
        />
        <StatCard
          label="Out for delivery"
          value={String(stats.outForDelivery)}
          hint="On the road"
        />
        <StatCard
          label="Revenue today"
          value={formatFcfa(stats.revenueToday)}
          hint="Excl. cancelled"
          tone="primary"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Revenue — last 14 days</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/retailer/earnings">
                Earnings <ArrowRight aria-hidden="true" className="size-3.5" />
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
          <h2 className="text-sm font-semibold">Needs your action</h2>
          <PendingOrderList role="retailer" orders={pending} />
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent orders</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/retailer/orders">
              All orders <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </Button>
        </div>
        <OrdersDataTable role="retailer" data={orders.slice(0, 10)} />
      </section>
    </div>
  );
}
