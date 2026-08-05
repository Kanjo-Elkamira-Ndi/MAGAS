import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { OrdersDataTable } from "@/components/dashboard/orders-table";
import { requireRole } from "@/lib/auth/session";
import { getOrdersByCustomer } from "@/lib/db/queries/orders";

export const metadata: Metadata = { title: "My orders — MAGAS" };

export default async function CustomerOrdersPage() {
  const session = await requireRole("customer");
  const customerId = session.user.customerId ?? "";

  const orders = await getOrdersByCustomer(customerId, 100);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My orders"
        description="Every order you've placed, with live status and payment details."
      />
      <OrdersDataTable role="customer" data={orders} />
    </div>
  );
}
