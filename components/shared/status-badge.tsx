import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/types/db";

// Shared order-status badge per context/ui-context.md. Used by customer,
// retailer, and admin views so status colors never drift between actors.
// Color is never the only signal — every status has a text label.
// Palette comes from the design-system tokens in globals.css and is
// WCAG AA in both themes (light + dark).

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
  placed: "border-transparent bg-muted text-muted-foreground",
  confirmed: "border-transparent bg-info text-info-foreground",
  assigned: "border-transparent bg-info text-info-foreground",
  out_for_delivery: "border-transparent bg-warning text-warning-foreground",
  delivered: "border-transparent bg-success text-success-foreground",
  cancelled: "border-transparent bg-secondary text-secondary-foreground",
  failed: "border-transparent bg-destructive text-destructive-foreground",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge
      variant="outline"
      className={STATUS_STYLES[status]}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
