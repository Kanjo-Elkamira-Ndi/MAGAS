import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireRole } from "@/lib/auth/session";
import { getApprovedRetailers } from "@/lib/db/queries/retailers";
import { getBrowseProducts } from "@/lib/db/queries/products";
import { formatFcfa } from "@/lib/db/queries/orders";

export const metadata: Metadata = { title: "Browse retailers — MAGAS" };

export default async function CustomerRetailersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole("customer");
  const { q } = await searchParams;
  const needle = (q ?? "").trim().toLowerCase();

  const [retailers, products] = await Promise.all([
    getApprovedRetailers(),
    getBrowseProducts(),
  ]);

  const filteredProducts = needle
    ? products.filter(
        (p) =>
          p.retailer_name?.toLowerCase().includes(needle) ||
          p.retailer_location?.toLowerCase().includes(needle) ||
          p.brand.toLowerCase().includes(needle) ||
          p.cylinder_size.toLowerCase().includes(needle),
      )
    : products;

  const byRetailer = new Map(
    retailers.map((r) => [r.id, filteredProducts.filter((p) => p.retailer_id === r.id)]),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Browse retailers"
        description={needle ? `Results for “${q}”` : "Approved retailers near you with live prices — order and pay by cash, MoMo, or Orange Money."}
      />

      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card px-4 py-16 text-center">
          <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Package aria-hidden="true" className="size-5" />
          </span>
          <p className="text-sm font-semibold">
            {needle ? "No retailers or products match your search." : "No retailers available yet."}
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {needle ? "Try a different retailer, brand, or size." : "Retailers that get approved will appear here."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {retailers
            .filter((r) => (byRetailer.get(r.id) ?? []).length > 0)
            .map((retailer) => {
              const items = byRetailer.get(retailer.id) ?? [];
              return (
                <li key={retailer.id} className="flex flex-col overflow-hidden rounded-xl border bg-card">
                  <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{retailer.business_name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin aria-hidden="true" className="size-3" />
                        {retailer.location}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                      {retailer.orders} orders
                    </span>
                  </div>
                  <ul className="divide-y">
                    {items.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {p.brand} · {p.cylinder_size}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {p.availability ? "In stock" : "Out of stock"}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold">
                          {formatFcfa(p.price)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t p-3">
                    <Button asChild size="sm" className="w-full">
                      <Link href={`/customer/checkout/${retailer.id}`}>Order from here</Link>
                    </Button>
                  </div>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
