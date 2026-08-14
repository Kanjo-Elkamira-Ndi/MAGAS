import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { OrdersDataTable } from "@/components/dashboard/orders-table";
import { requireRole } from "@/lib/auth/session";
import { getOrdersByAgent } from "@/lib/db/queries/orders";

export const metadata: Metadata = { title: "Deliveries — MAGAS agent" };

export default async function AgentOrdersPage() {
  const session = await requireRole("agent");
  const agentId = session.user.agentId ?? "";

  const orders = await getOrdersByAgent(agentId, 200);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Your deliveries"
        description="Every order assigned to you, past and present. Open one to update its status."
      />
      <OrdersDataTable role="agent" data={orders} />
    </div>
  );
}
