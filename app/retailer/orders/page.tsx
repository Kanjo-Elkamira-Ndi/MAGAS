import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { OrdersDataTable } from "@/components/dashboard/orders-table";
import { requireRole } from "@/lib/auth/session";
import { getOrdersByRetailer } from "@/lib/db/queries/orders";

export const metadata: Metadata = { title: "Orders — MAGAS retailer" };

export default async function RetailerOrdersPage() {
  const session = await requireRole("retailer");
  const retailerId = session.user.retailerId ?? "";

  const orders = await getOrdersByRetailer(retailerId, 200);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Orders"
        description="Everything for your shop. Filter by status, search, and open an order to confirm, cancel, or track it."
      />
      <OrdersDataTable role="retailer" data={orders} />
    </div>
  );
}
