import { requireRole } from "@/lib/auth/session";
import {
  DashboardShell,
  type DashboardUser,
} from "@/components/dashboard/dashboard-shell";
import { getCustomerStats } from "@/lib/db/queries/orders";

export default async function CustomerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireRole("customer");
  const customerId = session.user.customerId ?? "";

  const stats = await getCustomerStats(customerId);
  const active = stats.active;

  return (
    <DashboardShell
      user={session.user as DashboardUser}
      badges={{ "/customer/orders": active }}
      search={{ scope: "orders" }}
      alerts={
        active > 0
          ? {
              count: active,
              href: "/customer/orders",
              label: `${active} active order${active === 1 ? "" : "s"}`,
            }
          : undefined
      }
    >
      {children}
    </DashboardShell>
  );
}
