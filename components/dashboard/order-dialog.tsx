"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { OrderTimeline } from "@/components/dashboard/order-timeline";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatFcfa } from "@/lib/format";
import {
  assignAgentAction,
  cancelOrderAction,
  confirmOrderAction,
  getOrderDetailAction,
  listActiveAgentsAction,
  markDeliveredAction,
  markFailedAction,
  markOutForDeliveryAction,
} from "@/lib/actions/dashboard";
import type { PaymentMethod } from "@/types/db";

type Detail = NonNullable<Awaited<ReturnType<typeof getOrderDetailAction>>>;
type Agent = NonNullable<Awaited<ReturnType<typeof listActiveAgentsAction>>>[number];

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cod: "Cash on delivery",
  momo: "MoMo",
  orange: "Orange Money",
};

export function OrderDialog({
  open,
  onOpenChange,
  orderId,
  role,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  role: "customer" | "retailer" | "admin";
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentId, setAgentId] = useState("");
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<"cancel" | "fail" | null>(null);

  useEffect(() => {
    if (!open) return;
    setDetail(null);
    setAgentId("");
    getOrderDetailAction(orderId)
      .then((d) => {
        setDetail(d);
        return d ? listActiveAgentsAction() : [];
      })
      .then((a) => setAgents(a))
      .catch(() => setDetail(null));
  }, [open, orderId]);

  function run(action: () => Promise<unknown>, done?: () => void) {
    startTransition(async () => {
      await action();
      router.refresh();
      done?.();
    });
  }

  const status = detail?.status;

  const canCancel = status === "placed" || status === "confirmed";
  const canAssign = role === "admin" && status === "confirmed";
  const canSend = role === "admin" && status === "assigned";
  const canDeliver = role === "admin" && status === "out_for_delivery";
  const canFail = role === "admin" && (status === "assigned" || status === "out_for_delivery");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-3">
              Order #{detail?.id.slice(0, 8).toUpperCase() ?? "…"}
              {detail?.status && <StatusBadge status={detail.status} />}
            </DialogTitle>
            <DialogDescription>
              {detail ? `Placed ${new Date(detail.created_at).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}` : "Loading order details…"}
            </DialogDescription>
          </DialogHeader>

          {!detail ? (
            <div className="flex items-center justify-center py-16">
              <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" aria-hidden="true" />
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <OrderTimeline status={detail.status} />

              <div className="grid gap-4 sm:grid-cols-3">
                <Info label="From" value={detail.business_name ?? "—"} sub={detail.retailer_location ?? undefined} />
                <Info label="Customer" value={detail.customer_name ?? "—"} />
                <Info label="Payment" value={PAYMENT_LABEL[detail.payment_method as PaymentMethod]} sub={detail.payment?.status} />
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Items
                </p>
                <ul className="divide-y rounded-xl border">
                  {detail.items.map((item) => (
                    <li key={item.product_id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium">
                          {item.brand} · {item.cylinder_size}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} × {formatFcfa(item.price_at_order)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatFcfa(item.price_at_order * item.quantity)}
                      </span>
                    </li>
                  ))}
                  <li className="flex items-center justify-between gap-3 bg-muted/40 px-4 py-3">
                    <span className="text-sm font-semibold">Total</span>
                    <span className="text-sm font-bold">{formatFcfa(detail.total_amount)}</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border bg-card p-4 text-sm">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Delivery address
                </p>
                <p className="mt-1">{detail.delivery_address}</p>
                {detail.assignment && (
                  <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                    Assigned to <span className="font-medium text-foreground">{detail.assignment.agent_name}</span>
                  </p>
                )}
                {detail.status === "cancelled" && detail.cancelled_reason && (
                  <p className="mt-2 border-t pt-2 text-xs text-destructive">
                    Reason: {detail.cancelled_reason}
                  </p>
                )}
              </div>

              {(canCancel || canAssign || canSend || canDeliver || canFail) && (
                <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                  {canAssign && (
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <Select value={agentId} onValueChange={setAgentId}>
                        <SelectTrigger className="min-w-48 flex-1" aria-label="Delivery agent">
                          <SelectValue placeholder="Select delivery agent" />
                        </SelectTrigger>
                        <SelectContent>
                          {agents.length === 0 ? (
                            <p className="px-3 py-2 text-xs text-muted-foreground">No active agents — create one first.</p>
                          ) : (
                            agents.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name} · {a.phone}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        disabled={!agentId || pending}
                        onClick={() => run(() => assignAgentAction(orderId, agentId))}
                      >
                        Assign agent
                      </Button>
                    </div>
                  )}
                  {canSend && (
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() => run(() => markOutForDeliveryAction(orderId))}
                    >
                      Mark out for delivery
                    </Button>
                  )}
                  {canDeliver && (
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() => run(() => markDeliveredAction(orderId))}
                    >
                      <CheckCircle2 aria-hidden="true" className="size-4" />
                      Confirm delivered
                    </Button>
                  )}
                  {canFail && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => setConfirming("fail")}
                    >
                      <XCircle aria-hidden="true" className="size-4" />
                      Mark failed
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={pending}
                      onClick={() => setConfirming("cancel")}
                    >
                      Cancel order
                    </Button>
                  )}
                  {role === "retailer" && status === "placed" && (
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() => run(() => confirmOrderAction(orderId))}
                    >
                      Confirm order
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirming === "cancel"}
        onOpenChange={(o) => !o && setConfirming(null)}
        title="Cancel this order?"
        description="The customer will be notified and the payment, if any, will be voided. This cannot be undone."
        confirmLabel="Cancel order"
        variant="destructive"
        loading={pending}
        onConfirm={() => {
          run(
            () => cancelOrderAction(orderId, role === "customer" ? "Cancelled by customer" : undefined),
            () => setConfirming(null),
          );
        }}
      />

      <ConfirmDialog
        open={confirming === "fail"}
        onOpenChange={(o) => !o && setConfirming(null)}
        title="Mark this order as failed?"
        description="The delivery could not be completed. The order is closed as failed and any pending payment is voided."
        confirmLabel="Mark failed"
        variant="destructive"
        loading={pending}
        onConfirm={() => {
          run(() => markFailedAction(orderId), () => setConfirming(null));
        }}
      />
    </>
  );
}

function Info({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground capitalize">{sub}</p>}
    </div>
  );
}
