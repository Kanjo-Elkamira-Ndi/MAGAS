-- Additive migration: support inviting an existing delivery_agents contact
-- to a real login. Invited-but-not-yet-activated accounts sit in a distinct
-- 'pending' status (rather than overloading 'suspended') so they don't get
-- mixed into admin's punitive-suspension view, and their invite tokens use
-- a distinct 'agent_invite' purpose (rather than overloading
-- 'password_reset') so they can be looked up without also checking role.
ALTER TABLE users DROP CONSTRAINT users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'suspended', 'banned', 'pending'));

ALTER TABLE verification_tokens DROP CONSTRAINT verification_tokens_purpose_check;
ALTER TABLE verification_tokens ADD CONSTRAINT verification_tokens_purpose_check
  CHECK (purpose IN ('email_verify', 'phone_verify', 'password_reset', 'agent_invite'));
