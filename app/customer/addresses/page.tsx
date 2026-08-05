import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { AddressManager } from "@/components/dashboard/address-manager";
import { requireRole } from "@/lib/auth/session";
import { getAddressesByCustomer } from "@/lib/db/queries/addresses";
import { getCustomerProfile } from "@/lib/db/queries/users";

export const metadata: Metadata = { title: "Addresses — MAGAS" };

export default async function CustomerAddressesPage() {
  const session = await requireRole("customer");
  const customerId = session.user.customerId ?? "";

  const [addresses, profile] = await Promise.all([
    getAddressesByCustomer(customerId),
    getCustomerProfile(customerId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Saved addresses"
        description="Delivery points for faster checkout. The default is pre-filled when you order."
      />
      <AddressManager
        addresses={addresses}
        defaultAddressId={profile?.default_address_id ?? null}
      />
    </div>
  );
}
