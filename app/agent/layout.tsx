import { requireRole } from "@/lib/auth/session";
import {
  DashboardShell,
  type DashboardUser,
} from "@/components/dashboard/dashboard-shell";

export default async function AgentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireRole("agent");

  return (
    <DashboardShell user={session.user as DashboardUser}>
      {children}
    </DashboardShell>
  );
}
