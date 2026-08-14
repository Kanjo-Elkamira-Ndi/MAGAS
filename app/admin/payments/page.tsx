import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireRole } from "@/lib/auth/session";
import { formatFcfa } from "@/lib/db/queries/orders";
import { getAllPayments } from "@/lib/db/queries/payments";
import { reconcilePaymentAction } from "@/lib/actions/dashboard";

export const metadata: Metadata = { title: "Payments — MAGAS admin" };

const STATUS_STYLE: Record<string, string> = {
  success: "border-transparent bg-success text-success-foreground",
  pending: "border-transparent bg-warning text-warning-foreground",
  failed: "border-transparent bg-destructive text-destructive-foreground",
};

export default async function AdminPaymentsPage() {
  await requireRole("admin");
  const payments = await getAllPayments();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Payments"
        description="Every payment on the platform. COD payments are marked collected once delivery is confirmed."
      />
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Retailer</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    No payments recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-mono text-xs font-medium">
                      #{p.order_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">{p.customer_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.retailer_name ?? "—"}</td>
                    <td className="px-4 py-3 capitalize">{p.method}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">
                      {p.provider ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={STATUS_STYLE[p.status] ?? ""}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatFcfa(p.amount)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.method === "cod" && p.status === "pending" ? (
                        <form action={reconcilePaymentAction.bind(null, p.id)}>
                          <Button size="sm" variant="outline">
                            Mark collected
                          </Button>
                        </form>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {p.provider_ref ?? "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
