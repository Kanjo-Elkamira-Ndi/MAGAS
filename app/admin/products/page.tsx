import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireRole } from "@/lib/auth/session";
import { getAllProducts } from "@/lib/db/queries/products";
import { formatFcfa } from "@/lib/db/queries/orders";
import { toggleProductAction } from "@/lib/actions/dashboard";

export const metadata: Metadata = { title: "Products — MAGAS admin" };

export default async function AdminProductsPage() {
  await requireRole("admin");
  const products = await getAllProducts();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Products"
        description="Every cylinder listing across all retailers. Toggle stock availability platform-wide."
      />
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Retailer</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No products listed yet.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium">
                      {p.brand} · {p.cylinder_size}
                    </td>
                    <td className="px-4 py-3">{p.retailer_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.retailer_location ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatFcfa(p.price)}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={
                          p.availability
                            ? "border-transparent bg-success text-success-foreground"
                            : "border-transparent bg-muted text-muted-foreground"
                        }
                      >
                        {p.availability ? "In stock" : "Out of stock"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={toggleProductAction.bind(null, p.id, !p.availability)}>
                        <Button size="sm" variant="outline">
                          {p.availability ? "Set out of stock" : "Set in stock"}
                        </Button>
                      </form>
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
