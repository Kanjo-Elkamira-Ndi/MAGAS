import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProductsManager } from "@/components/dashboard/products-manager";
import { requireRole } from "@/lib/auth/session";
import { getProductsByRetailer } from "@/lib/db/queries/products";

export const metadata: Metadata = { title: "Products — MAGAS retailer" };

export default async function RetailerProductsPage() {
  const session = await requireRole("retailer");
  const retailerId = session.user.retailerId ?? "";

  const products = await getProductsByRetailer(retailerId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Products"
        description="Manage your cylinder listings, prices, and stock availability."
      />
      <ProductsManager products={products} />
    </div>
  );
}
