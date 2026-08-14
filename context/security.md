# Security — MAGAS

## Authentication

- **NextAuth**, Credentials Provider — no third-party auth service (no
  Clerk, no Better Auth, no Auth0)
- `authorize()` callback runs a raw `pg` lookup by email/phone, verifies the
  password with argon2 (preferred) or bcrypt — never store or compare plain
  text passwords
- **Session strategy: database**, via a small custom NextAuth adapter
  implemented over raw `pg` (backed by the `sessions` table). Chosen over
  JWT specifically so admin can force-revoke a session instantly (ban a
  retailer, suspend a customer) without a token-blocklist workaround
- Session cookie: `httpOnly`, `secure` (in production), `sameSite=lax` —
  handled by NextAuth itself, not custom cookie code
- `role`, and `retailer_id`/`agent_id` where relevant, attached to
  `session.user` via the `session`/`jwt` callbacks

## Authorization (RBAC)

- Single `role` enum on `users`: `customer | retailer | agent | admin`
- `middleware.ts` maps route-group prefixes to allowed roles and redirects
  unauthenticated/wrong-role requests
- Middleware protects **pages**; every API route handler must *also*
  independently verify the session and role server-side before doing any
  work — do not assume middleware alone covers API routes
- Row-level scoping: retailer and customer queries always filter by the
  session's own ID in SQL, never by trusting a client-supplied ID

## The Agent role — live, invite-only

- `role = 'agent'` exists in the `users` enum and the `delivery_agents` /
  `order_assignments` tables back it. The agent portal now ships:
  - **No public self-registration.** A `users` row with `role = 'agent'` is
    only ever created by an admin-triggered invite (`inviteAgentAction` in
    `lib/actions/dashboard.ts`), which links an existing `delivery_agents`
    contact record to a login via a `verification_tokens` row (purpose
    `agent_invite`). The account sits in `status = 'pending'` — unable to
    sign in — until the invitee sets their own password at
    `/agent-invite/[token]` (`lib/actions/agent.ts`,
    `activateAgentAccountAction`), which flips it to `active`.
  - `(agent)/*` pages are real: login, an assigned-orders overview and list,
    and order-detail status updates, scoped to the signed-in agent's own
    `delivery_agents` row (`session.user.agentId`).
  - `api/agent/*` **stays denied** in `middleware.ts` and the route handler
    stays a 501 stub — the portal ships as Server Actions
    (`lib/actions/agent.ts`), like every other role's mutations, so this
    REST surface is intentionally left dead rather than activated.
  - Status transitions (`out_for_delivery`/`delivered`/`failed`) route
    through the same `lib/orders/status.ts` transition map and
    `lib/orders/order-actions.ts` functions the admin flow already used,
    gated by an ownership check against `order_assignments` so an agent can
    only act on their own assignments.

## Payments — real, via NotchPay (primary) + Fapshi (fallback)

- Real money moves through this app now. Provider credentials
  (`NOTCHPAY_SECRET_KEY`, `FAPSHI_API_USER`/`FAPSHI_API_KEY`, webhook
  secrets) live only in environment variables, never committed —
  `lib/payments/notchpay.ts`/`fapshi.ts` read them lazily inside the
  functions that need them, not at import time, so the app keeps working
  (COD, every other page) with zero payment keys configured.
- **Webhook payloads are signature-verified before anything is trusted.**
  `app/api/payments/notchpay/route.ts` and `.../fapshi/route.ts` read the
  raw request body (`req.text()`, not `.json()` first — verification needs
  the exact bytes the provider signed), verify the signature, and only
  then parse/act on the payload. An invalid signature is rejected (`401`)
  before the DB is ever touched. This is the one route in the app that
  trusts a verified signature instead of a session/role — see
  `middleware.ts`'s comment on why `/api/payments/*` is deliberately left
  out of the auth gate.
- `payments.status` is never client-writable: `updatePaymentStatus()`
  only runs from the webhook handlers, the poll fallback
  (`pollPaymentStatusAction`), and admin's `reconcilePaymentAction` (now
  server-enforced to `method = 'cod' AND status = 'pending'`, closing a
  gap where the action previously trusted the UI alone to gate it —
  a crafted request against a real momo/orange payment id could otherwise
  fabricate a `success` on money that never arrived).
- Webhook processing is idempotent (`WHERE status = 'pending'` on every
  update) — a redelivered webhook, or a poll tick racing a webhook, is a
  safe no-op rather than a double-write.
- Checkout (`lib/actions/checkout.ts`) re-fetches every product price
  server-side and never trusts a client-supplied amount — the payment
  analog of "no client-writable status."

## Input handling

- All input validated with Zod before touching the database
- All DB access parameterized — no string-built SQL
- File/image uploads (if added later, e.g. retailer product photos): validate
  file type and size server-side, store outside the public web root or via
  an object storage service, never trust client-declared MIME type alone

## Secrets & environment

- All secrets (DB connection string, NextAuth secret, future provider keys)
  in environment variables, never committed; `.env.example` documents every
  required variable with placeholder values only
- `NEXTAUTH_SECRET` must be a strong random value in every environment,
  rotated if ever exposed

## Account lifecycle & abuse controls

- Registration requires email or phone verification before first order can
  be placed (via `verification_tokens`)
- Admin can suspend/ban any account (`users.status`); a suspended session
  must be invalidated immediately — this is the core reason the database
  session strategy was chosen over JWT
- Password reset tokens are single-use and time-limited
  (`verification_tokens.expires_at`)

## Data exposure

- Public (unauthenticated) endpoints only ever return approved, active
  retailers/products — never expose pending/suspended retailers, customer
  PII, or order data to unauthenticated routes
- API error responses never leak raw database errors, stack traces, or
  internal identifiers beyond what the client legitimately needs
