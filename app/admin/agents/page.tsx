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
        description="Agent records are plain contacts today. When the agent portal ships, these get login access and live assignments."
      />
      <AgentsManager agents={agents} />
    </div>
  );
}
