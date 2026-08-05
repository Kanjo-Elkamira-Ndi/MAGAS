import { requireRole } from "@/lib/auth/session";

// Agent portal page — role-gated like the other dashboards. Only users
// with role 'agent' reach the placeholder below; agent *API* routes stay
// unconditionally denied in middleware.ts (no agent data is exposed in the
// MVP). The original Phase 0 layout denied everyone; that changed when the
// agent "coming soon" placeholder page was added.
export default async function AgentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireRole("agent");
  return <>{children}</>;
}
