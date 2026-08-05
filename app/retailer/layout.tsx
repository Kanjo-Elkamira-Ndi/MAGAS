import { requireRole } from "@/lib/auth/session";
import {
  DashboardShell,
  type DashboardUser,
} from "@/components/dashboard/dashboard-shell";
import { countOrdersByStatus } from "@/lib/db/queries/orders";

export default async function RetailerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireRole("retailer");
  const retailerId = session.user.retailerId ?? "";

  const pending = await countOrdersByStatus(retailerId, "placed");

  return (
    <DashboardShell
      user={session.user as DashboardUser}
      badges={{ "/retailer/orders": pending }}
      search={{ scope: "products" }}
      alerts={
        pending > 0
          ? {
              count: pending,
              href: "/retailer/orders",
              label: `${pending} order${pending === 1 ? "" : "s"} to confirm`,
            }
          : undefined
      }
    >
      {children}
    </DashboardShell>
  );
}
