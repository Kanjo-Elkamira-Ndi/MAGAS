import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/db";
import { StatusBadge } from "@/components/shared/status-badge";

// Visual progress stepper for order tracking. Color is never the only
// signal — every step is labelled, and the current step gets an explicit
// "Current" state. Terminal states (cancelled / failed) render as a
// distinct banner instead of a half-completed progress bar.

const ORDER_STEPS: Array<{ status: OrderStatus; label: string; hint: string }> = [
  { status: "placed", label: "Placed", hint: "Order received" },
  { status: "confirmed", label: "Confirmed", hint: "Retailer accepted" },
  { status: "assigned", label: "Assigned", hint: "Delivery arranged" },
  { status: "out_for_delivery", label: "Out for delivery", hint: "On its way" },
  { status: "delivered", label: "Delivered", hint: "At your door" },
];

const TERMINAL: Record<"cancelled" | "failed", { title: string; detail: string }> = {
  cancelled: { title: "Order cancelled", detail: "This order will not be fulfilled." },
  failed: { title: "Order failed", detail: "The order could not be completed." },
};

export function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === "cancelled" || status === "failed") {
    const terminal = TERMINAL[status];
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-xl border p-4",
          status === "failed" && "border-destructive/40",
        )}
      >
        <StatusBadge status={status} />
        <div>
          <p className="text-sm font-semibold">{terminal.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{terminal.detail}</p>
        </div>
      </div>
    );
  }

  const currentIndex = ORDER_STEPS.findIndex((s) => s.status === status);

  return (
    <ol className="flex items-start" aria-label="Order progress">
      {ORDER_STEPS.map((step, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        const isLast = index === ORDER_STEPS.length - 1;

        return (
          <li
            key={step.status}
            className={cn("relative flex-1", !isLast && "pr-2")}
          >
            <div className="flex items-center">
              <span
                aria-current={current ? "step" : undefined}
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-semibold",
                  done && "border-success bg-success text-success-foreground",
                  current && "border-primary bg-primary text-primary-foreground",
                  !done && !current && "border-muted bg-muted text-muted-foreground",
                )}
              >
                {done ? (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 12 12"
                    className="size-3 fill-none stroke-current stroke-2"
                  >
                    <path d="M2 6.5 4.8 9 10 3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mx-1 h-0.5 flex-1 rounded-full",
                    done || current ? "bg-primary/60" : "bg-muted",
                  )}
                />
              )}
            </div>
            <div className="mt-2">
              <p
                className={cn(
                  "text-xs font-semibold",
                  done || current ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </p>
              <p className="mt-0.5 hidden text-[11px] text-muted-foreground sm:block">
                {step.hint}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
