import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireRole } from "@/lib/auth/session";
import { getAllRetailers } from "@/lib/db/queries/retailers";
import { setRetailerStatusAction } from "@/lib/actions/dashboard";

export const metadata: Metadata = { title: "Retailers — MAGAS admin" };

const STATUS_STYLE: Record<string, string> = {
  pending: "border-transparent bg-warning text-warning-foreground",
  approved: "border-transparent bg-success text-success-foreground",
  suspended: "border-transparent bg-destructive text-destructive-foreground",
};

export default async function AdminRetailersPage() {
  await requireRole("admin");
  const retailers = await getAllRetailers();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Retailers"
        description="Approve new shops, review their listings, and suspend retailers that break the rules."
      />
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-3 font-medium">Shop</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Orders</th>
                <th className="px-4 py-3 text-right font-medium">Products</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {retailers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No retailer accounts yet.
                  </td>
                </tr>
              ) : (
                retailers.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.business_name}</p>
                      <p className="text-xs text-muted-foreground">{r.location}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.owner_email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={STATUS_STYLE[r.status] ?? ""}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">{r.orders}</td>
                    <td className="px-4 py-3 text-right">{r.products}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {r.status !== "approved" && (
                          <form action={setRetailerStatusAction.bind(null, r.id, "approved")}>
                            <Button size="sm" variant="outline">
                              Approve
                            </Button>
                          </form>
                        )}
                        {r.status !== "suspended" && (
                          <form action={setRetailerStatusAction.bind(null, r.id, "suspended")}>
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                              {r.status === "pending" ? "Reject" : "Suspend"}
                            </Button>
                          </form>
                        )}
                      </div>
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
