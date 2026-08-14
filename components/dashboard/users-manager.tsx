"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { DataTable, type DataColumn } from "@/components/dashboard/data-table";
import { setUserStatusAction } from "@/lib/actions/dashboard";
import type { AdminUserListItem } from "@/lib/db/queries/users";
import type { UserStatus } from "@/types/db";

const ROLE_STYLE: Record<string, string> = {
  customer: "border-transparent bg-muted text-muted-foreground",
  retailer: "border-transparent bg-info text-info-foreground",
  agent: "border-transparent bg-warning text-warning-foreground",
  admin: "border-transparent bg-primary text-primary-foreground",
};

const STATUS_STYLE: Record<UserStatus, string> = {
  active: "border-transparent bg-success text-success-foreground",
  suspended: "border-transparent bg-warning text-warning-foreground",
  banned: "border-transparent bg-destructive text-destructive-foreground",
  // Invited agent accounts that haven't set a password yet — distinct from
  // a punitive suspension. See lib/db/migrations/003_agent_invite.sql.
  pending: "border-transparent bg-info text-info-foreground",
};

type PendingAction = { user: AdminUserListItem; status: UserStatus } | null;

const COLUMNS: DataColumn<AdminUserListItem>[] = [
  {
    key: "display_name",
    header: "Name",
    sortable: true,
    cell: (u) => (
      <div>
        <p className="font-medium">{u.display_name ?? "—"}</p>
        <p className="text-xs text-muted-foreground">{u.email ?? u.phone ?? u.id}</p>
      </div>
    ),
  },
  {
    key: "role",
    header: "Role",
    cell: (u) => (
      <Badge variant="outline" className={ROLE_STYLE[u.role]}>
        {u.role}
      </Badge>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (u) => (
      <Badge variant="outline" className={STATUS_STYLE[u.status]}>
        {u.status}
      </Badge>
    ),
  },
  {
    key: "orders",
    header: "Orders",
    sortable: true,
    className: "text-right",
    cell: (u) => <span className="text-sm">{u.orders}</span>,
  },
  {
    key: "created_at",
    header: "Joined",
    sortable: true,
    sortValue: (u) => u.created_at.getTime(),
    cell: (u) => (
      <span className="text-xs text-muted-foreground">
        {new Date(u.created_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </span>
    ),
  },
];

export function UsersManager({ users }: { users: AdminUserListItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<PendingAction>(null);

  function apply(u: AdminUserListItem, status: UserStatus) {
    setConfirm({ user: u, status });
  }

  return (
    <div className="flex flex-col gap-3">
      <DataTable
        columns={[
          ...COLUMNS,
          {
            key: "actions",
            header: "",
            className: "text-right",
            cell: (u) => (
              <div className="flex justify-end gap-1">
                {u.status === "pending" ? (
                  // Set via the delivery-agent invite link, not here — an
                  // admin can still revoke the invite by banning it.
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={pending}
                    onClick={() => apply(u, "banned")}
                  >
                    Revoke
                  </Button>
                ) : u.status === "banned" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => apply(u, "active")}
                  >
                    Activate
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => apply(u, u.status === "active" ? "suspended" : "active")}
                    >
                      {u.status === "active" ? "Suspend" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={pending}
                      onClick={() => apply(u, "banned")}
                    >
                      Ban
                    </Button>
                  </>
                )}
              </div>
            ),
          },
        ]}
        data={users}
        getRowId={(u) => u.id}
        searchKeys={[(u) => u.display_name ?? "", (u) => u.email ?? "", (u) => u.role, (u) => u.status]}
        searchPlaceholder="Search users…"
        defaultSort={{ key: "created_at", dir: "desc" }}
        empty={{
          title: "No users yet",
          description: "Registered customers, retailers and agents appear here.",
        }}
      />

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={
          confirm?.status === "banned"
            ? `Ban ${confirm?.user.display_name ?? "this user"}?`
            : confirm?.status === "suspended"
              ? `Suspend ${confirm?.user.display_name ?? "this user"}?`
              : `Activate ${confirm?.user.display_name ?? "this user"}?`
        }
        description={
          confirm?.status === "banned"
            ? "The user will lose access immediately and will not be able to sign in."
            : confirm?.status === "suspended"
              ? "The user will be blocked from signing in until you reactivate them."
              : "The user will regain access to their account."
        }
        confirmLabel={
          confirm?.status === "banned" ? "Ban user" : confirm?.status === "suspended" ? "Suspend" : "Activate"
        }
        variant={confirm?.status === "banned" ? "destructive" : "default"}
        loading={pending}
        onConfirm={() => {
          if (!confirm) return;
          startTransition(async () => {
            await setUserStatusAction(confirm.user.id, confirm.status);
            setConfirm(null);
            router.refresh();
          });
        }}
      />
    </div>
  );
}
