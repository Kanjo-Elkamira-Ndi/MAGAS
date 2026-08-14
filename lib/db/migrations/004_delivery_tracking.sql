-- Additive migration: coordinates for live delivery tracking. All columns
-- nullable — existing rows simply have no position yet, and every reader
-- must degrade gracefully rather than assume these are populated.
--
-- delivery_agents: the agent's current live position (overwritten on each
-- report, no history — matches how order_assignments already treats
-- "current state" over an audit trail).
ALTER TABLE delivery_agents
  ADD COLUMN latitude double precision,
  ADD COLUMN longitude double precision,
  ADD COLUMN location_updated_at timestamptz;

-- addresses / retailers: captured via Google Places Autocomplete at
-- entry time, not backfilled by geocoding free text.
ALTER TABLE addresses
  ADD COLUMN latitude double precision,
  ADD COLUMN longitude double precision;

ALTER TABLE retailers
  ADD COLUMN latitude double precision,
  ADD COLUMN longitude double precision;

-- orders: the delivery destination pin. Added ahead of a live checkout
-- flow (which doesn't exist yet — orders are only ever seeded today) so
-- this feature is testable now and forward-compatible once checkout ships.
ALTER TABLE orders
  ADD COLUMN delivery_latitude double precision,
  ADD COLUMN delivery_longitude double precision;
