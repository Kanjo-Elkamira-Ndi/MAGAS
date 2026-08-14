"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Truck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import {
  agentMarkDeliveredAction,
  agentMarkFailedAction,
  agentMarkOutForDeliveryAction,
} from "@/lib/actions/agent";
import type { OrderStatus } from "@/types/db";

// Delivery-status controls for an agent's own assigned order. Mirrors the
// transition set in lib/orders/status.ts — buttons only ever appear for a
// legal next state, and "mark failed" is destructive so it goes through
// ConfirmDialog like every other irreversible action in the dashboard.
export function AgentStatusActions({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmingFail, setConfirmingFail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = status === "assigned";
  const canDeliver = status === "out_for_delivery";
  const canFail = status === "assigned" || status === "out_for_delivery";

  function run(action: () => Promise<unknown>, done?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
        done?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "That didn't go through.");
      }
    });
  }

  if (!canSend && !canDeliver && !canFail) return null;

  return (
    <div className="flex flex-col gap-2 border-t pt-4">
      <div className="flex flex-wrap items-center gap-2">
        {canSend && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(() => agentMarkOutForDeliveryAction(orderId))}
          >
            <Truck aria-hidden="true" className="size-4" />
            Mark out for delivery
          </Button>
        )}
        {canDeliver && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(() => agentMarkDeliveredAction(orderId))}
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
            onClick={() => setConfirmingFail(true)}
          >
            <XCircle aria-hidden="true" className="size-4" />
            Mark failed
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      <ConfirmDialog
        open={confirmingFail}
        onOpenChange={setConfirmingFail}
        title="Mark this delivery as failed?"
        description="The order is closed as failed and any pending payment is voided. This cannot be undone."
        confirmLabel="Mark failed"
        variant="destructive"
        loading={pending}
        onConfirm={() => run(() => agentMarkFailedAction(orderId), () => setConfirmingFail(false))}
      />
    </div>
  );
}
