import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { requireRole } from "@/lib/auth/session";
import { getRetailerProfile } from "@/lib/db/queries/retailers";
import { getProductsByRetailer } from "@/lib/db/queries/products";
import { getAddressesByCustomer } from "@/lib/db/queries/addresses";
import { getCustomerProfile } from "@/lib/db/queries/users";

export const metadata: Metadata = { title: "Checkout — MAGAS" };

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ retailerId: string }>;
}) {
  const session = await requireRole("customer");
  const customerId = session.user.customerId ?? "";
  const { retailerId } = await params;

  const [retailer, products, addresses, profile] = await Promise.all([
    getRetailerProfile(retailerId),
    getProductsByRetailer(retailerId),
    getAddressesByCustomer(customerId),
    getCustomerProfile(customerId),
  ]);

  if (!retailer || retailer.status !== "approved") notFound();

  const inStock = products.filter((p) => p.availability);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Order from ${retailer.business_name}`}
        description={retailer.location}
      />
      <CheckoutForm
        retailerId={retailerId}
        products={inStock}
        addresses={addresses}
        defaultAddressId={profile?.default_address_id ?? null}
      />
    </div>
  );
}
