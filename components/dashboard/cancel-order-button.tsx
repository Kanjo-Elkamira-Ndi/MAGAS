"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { cancelOrderAction } from "@/lib/actions/dashboard";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setOpen(true)}
        disabled={pending}
      >
        Cancel order
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Cancel this order?"
        description="Your pending payment, if any, will be voided and the retailer will be notified. This cannot be undone."
        confirmLabel="Cancel order"
        variant="destructive"
        loading={pending}
        onConfirm={() => {
          startTransition(async () => {
            await cancelOrderAction(orderId, "Cancelled by customer");
            router.refresh();
            setOpen(false);
          });
        }}
      />
    </>
  );
}
