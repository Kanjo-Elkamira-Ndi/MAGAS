"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { retryPaymentAction } from "@/lib/actions/payments";

// Shown when the latest payment attempt on an order failed. Re-collects
// the phone number rather than reusing the original one (not persisted
// anywhere, and the customer may want to try a different number/provider
// account) and re-runs the charge orchestrator, which inserts a brand
// new payments row — full attempt history stays intact.
export function RetryPaymentForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!phone.trim()) {
      setError("Enter the phone number to charge.");
      return;
    }
    startTransition(async () => {
      try {
        const result = await retryPaymentAction(orderId, phone.trim());
        if (result.chargeResult.kind === "redirect") {
          window.location.href = result.chargeResult.redirectUrl;
          return;
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not retry payment.");
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4"
    >
      <p className="text-sm font-semibold text-destructive">Payment failed</p>
      <p className="text-xs text-muted-foreground">
        Your order is still here — retry the payment when you&apos;re ready.
      </p>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor="retry-phone" className="text-xs">
            Phone number
          </Label>
          <Input
            id="retry-phone"
            placeholder="+237 6XX XX XX XX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          <RefreshCw aria-hidden="true" className="size-3.5" />
          {pending ? "Retrying…" : "Retry payment"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
