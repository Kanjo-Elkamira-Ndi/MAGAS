import type { OrderStatus } from "@/types/db";

// Single source of truth for valid order-status transitions. Every
// actor (customer, retailer, admin) routes status changes through this
// module — never inline transition checks in route handlers per
// context/architecture.md and context/workflows.md.

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ["confirmed", "cancelled", "failed"],
  confirmed: ["assigned", "cancelled", "failed"],
  assigned: ["out_for_delivery", "failed"],
  out_for_delivery: ["delivered", "failed"],
  delivered: [],
  cancelled: [],
  failed: [],
};

export class IllegalTransitionError extends Error {
  constructor(
    public readonly from: OrderStatus,
    public readonly to: OrderStatus,
  ) {
    super(`Cannot transition order from '${from}' to '${to}'.`);
    this.name = "IllegalTransitionError";
  }
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertCanTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new IllegalTransitionError(from, to);
  }
}
