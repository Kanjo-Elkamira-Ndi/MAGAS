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

## The dormant Agent role — explicit rules

- `role = 'agent'` exists in the `users` enum and `delivery_agents` /
  `order_assignments` tables exist, but:
  - There is **no registration flow** that creates a `users` row with
    `role = 'agent'`
  - `(agent)/*` pages and `api/agent/*` routes are stubs that return a
    "not available" state regardless of any other condition
  - `middleware.ts` denies `role === 'agent'` access unconditionally for now
- Do not build out agent login, agent dashboards, or agent-facing status
  updates without an explicit go-ahead — this is a deliberate MVP boundary,
  not an oversight

## Payments — simulated, not a real attack surface yet

- MVP payments are simulated (`/api/payments/simulate`) — no real financial
  transaction ever occurs, no provider credentials exist in the codebase
- Even so, treat the `payments` table and its routes with the same care as
  a real payment system: admin-only reconciliation, no client-writable
  `status` field, audit via `created_at`/`updated_at`
- When real MoMo/Orange Money integration begins post-MVP: webhook payloads
  must be signature-verified per provider docs before trusting them, and
  provider credentials go in environment variables, never committed

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
