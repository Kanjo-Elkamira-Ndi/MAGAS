import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/db";

// Shared order-status badge per context/ui-context.md. Used by customer,
// retailer, and admin views so status colors never drift between actors.
// Color is never the only signal — every status has a text label.

const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  assigned: "Assigned",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  failed: "Failed",
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  placed: "bg-slate-500/15 text-slate-700",
  confirmed: "bg-blue-500/15 text-blue-700",
  assigned: "bg-blue-500/15 text-blue-700",
  out_for_delivery: "bg-amber-500/15 text-amber-700",
  delivered: "bg-green-600/15 text-green-700",
  cancelled: "bg-slate-400/10 text-slate-500",
  failed: "bg-red-600/15 text-red-700",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent", STATUS_STYLES[status])}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
