import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { UsersManager } from "@/components/dashboard/users-manager";
import { requireRole } from "@/lib/auth/session";
import { listUsers } from "@/lib/db/queries/users";

export const metadata: Metadata = { title: "Users — MAGAS admin" };

export default async function AdminUsersPage() {
  await requireRole("admin");
  const users = await listUsers();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description="Every account on MAGAS. Suspend or ban users who violate the rules — destructive actions always ask first."
      />
      <UsersManager users={users} />
    </div>
  );
}
