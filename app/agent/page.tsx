import Link from "next/link";
import { ArrowRight, CheckCircle2, Truck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireRole } from "@/lib/auth/session";
import { formatFcfa, getAgentStats, getOrdersByAgent } from "@/lib/db/queries/orders";

export default async function AgentHomePage() {
  const session = await requireRole("agent");
  const agentId = session.user.agentId ?? "";
  const name = session.user.name ?? session.user.email ?? "there";

  const [stats, orders] = await Promise.all([
    getAgentStats(agentId),
    getOrdersByAgent(agentId, 6),
  ]);

  const active = orders.filter(
    (o) => o.status === "assigned" || o.status === "out_for_delivery",
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Welcome back, ${name}`}
        description="Your assigned deliveries and their current status."
      >
        <Button asChild variant="outline">
          <Link href="/agent/orders">
            All deliveries
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active"
          value={String(stats.active)}
          hint="Assigned or on the way"
          icon={<Truck aria-hidden="true" className="size-4" />}
          tone="primary"
        />
        <StatCard
          label="Delivered today"
          value={String(stats.deliveredToday)}
          hint="Completed today"
          icon={<CheckCircle2 aria-hidden="true" className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Delivered total"
          value={String(stats.deliveredTotal)}
          hint="All time"
        />
        <StatCard
          label="Failed"
          value={String(stats.failed)}
          hint="Could not be completed"
          icon={<XCircle aria-hidden="true" className="size-4" />}
          tone={stats.failed > 0 ? "warning" : "default"}
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Today&apos;s deliveries</h2>
        {active.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            <CheckCircle2 aria-hidden="true" className="size-4 text-success" />
            Nothing active right now — new assignments will show up here.
          </div>
        ) : (
          <ul className="overflow-hidden rounded-xl border bg-card">
            {active.map((order) => (
              <li
                key={order.id}
                className="flex items-center gap-3 border-b px-4 py-3 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {order.customer_name ?? "Customer"} · {formatFcfa(order.total_amount)}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {order.delivery_address}
                  </p>
                </div>
                <StatusBadge status={order.status} />
                <Button asChild size="sm" variant="outline">
                  <Link href={`/agent/order/${order.id}`}>View</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
