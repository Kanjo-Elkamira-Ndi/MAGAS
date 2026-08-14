"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { pollPaymentStatusAction } from "@/lib/actions/payments";

// Fallback for a missed/delayed webhook — actively re-checks the
// provider's status API each tick (see pollPaymentStatusAction), not
// just the DB. Modeled on components/dashboard/delivery-map.tsx's
// setInterval + Server Action pattern, the one documented live-polling
// exception (context/architecture.md). Capped so an abandoned tab
// doesn't poll forever.
const POLL_INTERVAL_MS = 15_000;
const MAX_TICKS = 20; // ~5 minutes

export function PaymentStatusPoller({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [ticks, setTicks] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const interval = setInterval(async () => {
      try {
        const payment = await pollPaymentStatusAction(orderId);
        if (cancelled) return;
        if (payment && payment.status !== "pending") {
          clearInterval(interval);
          router.refresh();
          return;
        }
      } catch {
        // Ignore a failed tick — try again next interval.
      }
      setTicks((t) => t + 1);
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId, router]);

  useEffect(() => {
    if (ticks >= MAX_TICKS) setGaveUp(true);
  }, [ticks]);

  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card p-4 text-sm">
      {gaveUp ? (
        <p className="text-muted-foreground">
          We&apos;ll update this automatically once your payment is confirmed — check back shortly.
        </p>
      ) : (
        <>
          <Loader2 aria-hidden="true" className="size-4 animate-spin text-primary" />
          <p className="text-muted-foreground">Waiting for payment confirmation…</p>
        </>
      )}
    </div>
  );
}
