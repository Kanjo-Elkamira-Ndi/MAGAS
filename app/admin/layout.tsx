import { requireRole } from "@/lib/auth/session";
import {
  DashboardShell,
  type DashboardUser,
} from "@/components/dashboard/dashboard-shell";
import { countPendingRetailers } from "@/lib/db/queries/retailers";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireRole("admin");

  const pendingRetailers = await countPendingRetailers();

  return (
    <DashboardShell
      user={session.user as DashboardUser}
      badges={{ "/admin/retailers": pendingRetailers }}
      search={{ scope: "admin" }}
      alerts={
        pendingRetailers > 0
          ? {
              count: pendingRetailers,
              href: "/admin/retailers",
              label: `${pendingRetailers} retailer approval${pendingRetailers === 1 ? "" : "s"} pending`,
            }
          : undefined
      }
    >
      {children}
    </DashboardShell>
  );
}
