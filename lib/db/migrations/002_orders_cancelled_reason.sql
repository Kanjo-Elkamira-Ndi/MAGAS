-- Additive migration: store the reason when a retailer or admin rejects or
-- cancels an order. Nullable on purpose — not every terminal transition
-- needs a reason.
ALTER TABLE orders ADD COLUMN cancelled_reason text;
