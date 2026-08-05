import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { OrdersDataTable } from "@/components/dashboard/orders-table";
import { requireRole } from "@/lib/auth/session";
import { getLatestOrders } from "@/lib/db/queries/orders";

export const metadata: Metadata = { title: "Orders — MAGAS admin" };

export default async function AdminOrdersPage() {
  await requireRole("admin");
  const orders = await getLatestOrders(500);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Orders"
        description="Every order on the platform. Open one to assign a delivery agent, advance its status, or cancel it."
      />
      <OrdersDataTable role="admin" data={orders} />
    </div>
  );
}
