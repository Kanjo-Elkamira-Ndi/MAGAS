-- Additive migration: persist the decline reason a payment provider
-- actually returned. Previously discarded after being returned once to
-- the client in that single request/response — made debugging a real
-- decline (vs. a code bug) needlessly hard, since nothing logged or
-- stored it anywhere.
ALTER TABLE payments ADD COLUMN failure_reason text;
