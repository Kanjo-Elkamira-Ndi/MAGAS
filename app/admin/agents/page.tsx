import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { AgentsManager } from "@/components/dashboard/agents-manager";
import { requireRole } from "@/lib/auth/session";
import { listDeliveryAgents } from "@/lib/db/queries/agents";

export const metadata: Metadata = { title: "Delivery agents — MAGAS admin" };

export default async function AdminAgentsPage() {
  await requireRole("admin");
  const agents = await listDeliveryAgents();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Delivery agents"
        description="Manage contact records and invite agents to log in and manage their own deliveries."
      />
      <AgentsManager agents={agents} />
    </div>
  );
}
