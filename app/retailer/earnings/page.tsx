import type { Metadata } from "next";
import { Link2, TrendingUp, Wallet } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { BarChart } from "@/components/dashboard/trend-chart";
import { requireRole } from "@/lib/auth/session";
import { formatFcfa } from "@/lib/db/queries/orders";
import {
  getPaymentsByRetailer,
  getRetailerEarnings,
  getRevenueByDay,
} from "@/lib/db/queries/payments";

export const metadata: Metadata = { title: "Earnings — MAGAS retailer" };

function PaymentBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    success: "border-transparent bg-success text-success-foreground",
    pending: "border-transparent bg-warning text-warning-foreground",
    failed: "border-transparent bg-destructive text-destructive-foreground",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles[status] ?? "border-transparent bg-muted text-muted-foreground"}`}
    >
      {status}
    </span>
  );
}

export default async function RetailerEarningsPage() {
  const session = await requireRole("retailer");
  const retailerId = session.user.retailerId ?? "";

  const [earnings, payments, trend] = await Promise.all([
    getRetailerEarnings(retailerId),
    getPaymentsByRetailer(retailerId),
    getRevenueByDay(14, retailerId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Earnings"
        description="What your shop has collected, including simulated MoMo/Orange payments and COD."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="This week"
          value={formatFcfa(earnings.week)}
          icon={<TrendingUp aria-hidden="true" className="size-4" />}
          tone="primary"
        />
        <StatCard
          label="This month"
          value={formatFcfa(earnings.month)}
          icon={<Wallet aria-hidden="true" className="size-4" />}
        />
        <StatCard
          label="All time"
          value={formatFcfa(earnings.allTime)}
          hint="Collected on successful payments"
        />
        <StatCard
          label="Pending COD"
          value={formatFcfa(0)}
          hint={`${earnings.pending} payment${earnings.pending === 1 ? "" : "s"} awaiting collection`}
          tone={earnings.pending > 0 ? "warning" : "default"}
        />
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="mb-4 text-sm font-semibold">Revenue — last 14 days</p>
        <BarChart
          data={trend.map((t) => ({
            label: new Date(t.day + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
            value: t.revenue,
          }))}
          formatValue={(v) => formatFcfa(v)}
          height={180}
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Recent payments</h2>
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      <Link2 aria-hidden="true" className="mx-auto mb-2 size-5" />
                      No payments yet. They appear as soon as orders are placed.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-mono text-xs font-medium">
                        #{p.order_id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3">{p.customer_name ?? "—"}</td>
                      <td className="px-4 py-3 capitalize">{p.method}</td>
                      <td className="px-4 py-3">
                        <PaymentBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatFcfa(p.amount)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
