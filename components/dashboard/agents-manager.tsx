"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { DataTable, type DataColumn } from "@/components/dashboard/data-table";
import {
  deleteAgentAction,
  inviteAgentAction,
  upsertAgentAction,
} from "@/lib/actions/dashboard";
import type { DeliveryAgentListItem } from "@/lib/db/queries/agents";
import type { AgentStatus } from "@/types/db";

const LOGIN_LABEL: Record<DeliveryAgentListItem["login_status"], string> = {
  none: "No login",
  pending: "Invited",
  active: "Active login",
};

type AgentForm = {
  id?: string;
  name: string;
  phone: string;
  status: AgentStatus;
};

const EMPTY_FORM: AgentForm = { name: "", phone: "", status: "active" };

const COLUMNS: DataColumn<DeliveryAgentListItem>[] = [
  {
    key: "name",
    header: "Name",
    sortable: true,
    cell: (a) => <span className="font-medium">{a.name}</span>,
  },
  {
    key: "phone",
    header: "Phone",
    cell: (a) => <span className="text-sm">{a.phone}</span>,
  },
  {
    key: "status",
    header: "Status",
    cell: (a) => (
      <Badge
        variant="outline"
        className={
          a.status === "active"
            ? "border-transparent bg-success text-success-foreground"
            : "border-transparent bg-muted text-muted-foreground"
        }
      >
        {a.status}
      </Badge>
    ),
  },
  {
    key: "active_assignments",
    header: "Active deliveries",
    sortable: true,
    cell: (a) => <span className="text-sm">{a.active_assignments}</span>,
  },
  {
    key: "login_status",
    header: "Login",
    cell: (a) => (
      <Badge
        variant="outline"
        className={
          a.login_status === "active"
            ? "border-transparent bg-success text-success-foreground"
            : a.login_status === "pending"
              ? "border-transparent bg-warning text-warning-foreground"
              : "border-transparent bg-muted text-muted-foreground"
        }
      >
        {LOGIN_LABEL[a.login_status]}
      </Badge>
    ),
  },
  {
    key: "created_at",
    header: "Added",
    cell: (a) => (
      <span className="text-xs text-muted-foreground">
        {new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
      </span>
    ),
  },
];

export function AgentsManager({ agents }: { agents: DeliveryAgentListItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<DeliveryAgentListItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<DeliveryAgentListItem | null>(null);
  const [inviting, setInviting] = useState<DeliveryAgentListItem | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState<AgentForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setCreating(true);
  }

  function openEdit(a: DeliveryAgentListItem) {
    setForm({ id: a.id, name: a.name, phone: a.phone, status: a.status });
    setError(null);
    setEditing(a);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await upsertAgentAction(form);
        setCreating(false);
        setEditing(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save agent.");
      }
    });
  }

  function openInvite(a: DeliveryAgentListItem) {
    setInviting(a);
    setInviteUrl(null);
    setInviteError(null);
    setCopied(false);
    startTransition(async () => {
      try {
        const { inviteUrl: url } = await inviteAgentAction(a.id);
        setInviteUrl(url);
        router.refresh();
      } catch (err) {
        setInviteError(err instanceof Error ? err.message : "Could not create an invite.");
      }
    });
  }

  async function copyInviteUrl() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus aria-hidden="true" className="size-4" />
          Add agent
        </Button>
      </div>

      <DataTable
        columns={[
          ...COLUMNS,
          {
            key: "actions",
            header: "",
            className: "text-right",
            cell: (a) => (
              <div className="flex justify-end gap-1">
                {a.login_status !== "active" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openInvite(a)}
                    title={a.login_status === "pending" ? "Resend invite link" : "Invite to login"}
                  >
                    <Send aria-hidden="true" className="size-4" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => openEdit(a)}>
                  <Pencil aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleting(a)}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </Button>
              </div>
            ),
          },
        ]}
        data={agents}
        getRowId={(a) => a.id}
        searchKeys={[(a) => a.name, (a) => a.phone, (a) => a.status]}
        searchPlaceholder="Search agents…"
        defaultSort={{ key: "name", dir: "asc" }}
        empty={{
          title: "No delivery agents",
          description: "Add a contact record, then invite them to log in and see their own assigned deliveries.",
          action: (
            <Button size="sm" variant="outline" onClick={openCreate}>
              <Plus aria-hidden="true" className="size-4" />
              Add agent
            </Button>
          ),
        }}
      />

      <Dialog
        open={creating || editing !== null}
        onOpenChange={(o) => !o && (setCreating(false), setEditing(null))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit agent" : "Add delivery agent"}</DialogTitle>
            <DialogDescription>
              A contact record for an order runner. Invite them separately once they&apos;re added to give them a login.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="a-name">Full name</Label>
              <Input
                id="a-name"
                required
                placeholder="e.g. Jean Nkoulou"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="a-phone">Phone</Label>
              <Input
                id="a-phone"
                required
                placeholder="e.g. +237 6 90 00 00 00"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(s: AgentStatus) => setForm({ ...form, status: s })}
              >
                <SelectTrigger className="w-full" aria-label="Agent status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCreating(false);
                  setEditing(null);
                }}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button onClick={save} disabled={pending}>
                {pending ? "Saving…" : editing ? "Save changes" : "Add agent"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this agent?"
        description={
          deleting
            ? `${deleting.name} will be removed. Current assignments stay on the orders they belong to.`
            : ""
        }
        confirmLabel="Delete"
        variant="destructive"
        loading={pending}
        onConfirm={() => {
          if (!deleting) return;
          startTransition(async () => {
            await deleteAgentAction(deleting.id);
            setDeleting(null);
            router.refresh();
          });
        }}
      />

      <Dialog open={inviting !== null} onOpenChange={(o) => !o && setInviting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite {inviting?.name}</DialogTitle>
            <DialogDescription>
              There&apos;s no email set up to send this automatically — copy the
              link below and share it with the agent yourself. It expires in
              7 days.
            </DialogDescription>
          </DialogHeader>
          {inviteError ? (
            <p className="text-sm text-destructive">{inviteError}</p>
          ) : !inviteUrl ? (
            <p className="text-sm text-muted-foreground">Creating invite link…</p>
          ) : (
            <div className="flex items-center gap-2">
              <Input readOnly value={inviteUrl} className="font-mono text-xs" />
              <Button size="sm" variant="outline" onClick={copyInviteUrl}>
                {copied ? (
                  <Check aria-hidden="true" className="size-4" />
                ) : (
                  <Copy aria-hidden="true" className="size-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setInviting(null)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
