import Link from "next/link";
import { ArrowRight, Flame, MapPin, Package, Truck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { RecentOrdersTable } from "@/components/dashboard/orders-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireRole } from "@/lib/auth/session";
import {
  formatFcfa,
  getCustomerStats,
  getLatestActiveOrder,
  getOrdersByCustomer,
} from "@/lib/db/queries/orders";

export default async function CustomerHomePage() {
  const session = await requireRole("customer");
  const customerId = session.user.customerId ?? "";
  const name = session.user.name ?? session.user.email ?? "there";

  const [stats, orders, activeOrder] = await Promise.all([
    getCustomerStats(customerId),
    getOrdersByCustomer(customerId, 10),
    getLatestActiveOrder(customerId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Welcome back, ${name.split(" ")[0]}`}
        description="Here's what's happening with your gas deliveries."
      >
        <Button asChild>
          <Link href="/customer/retailers">
            <Flame aria-hidden="true" className="size-4" />
            Order a cylinder
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active orders"
          value={String(stats.active)}
          hint={stats.active > 0 ? "Being fulfilled now" : "Nothing in transit"}
          icon={<Package aria-hidden="true" className="size-4" />}
          tone="primary"
        />
        <StatCard
          label="Delivered"
          value={String(stats.delivered)}
          hint="Lifetime orders delivered"
          icon={<Truck aria-hidden="true" className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Saved addresses"
          value={String(stats.addresses)}
          hint="Ready when you order"
          icon={<MapPin aria-hidden="true" className="size-4" />}
        />
        <StatCard
          label="Total spent"
          value={formatFcfa(stats.spent)}
          hint="On delivered orders"
          icon={<Wallet aria-hidden="true" className="size-4" />}
        />
      </div>

      {activeOrder && (
        <Link
          href={`/customer/order/${activeOrder.id}`}
          className="group flex flex-wrap items-center gap-4 rounded-xl border bg-primary/5 p-4 transition-colors hover:bg-primary/10"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Truck aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              Your order from {activeOrder.business_name ?? "the retailer"} is{" "}
              <StatusBadge status={activeOrder.status} />
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatFcfa(activeOrder.total_amount)} · placed{" "}
              {new Date(activeOrder.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })}
            </p>
          </div>
          <ArrowRight
            aria-hidden="true"
            className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent orders</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/customer/orders">
                View all <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </Button>
          </div>
          <RecentOrdersTable data={orders} />
        </section>

        <aside className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold">How delivery works</h2>
          <ol className="space-y-3">
            {[
              { icon: MapPin, title: "1. Choose your area", text: "Find approved retailers near you with live prices." },
              { icon: Flame, title: "2. Pick your cylinder", text: "Size, quantity, and payment method — COD, MoMo or Orange." },
              { icon: Truck, title: "3. Track to your door", text: "Follow the status until the cylinder arrives." },
            ].map((step) => (
              <li
                key={step.title}
                className="flex items-start gap-3 rounded-xl border bg-card p-4"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <step.icon aria-hidden="true" className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
