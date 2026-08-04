# Development Roadmap — MAGAS

This roadmap sequences the MVP build. Phases are ordered by dependency, not
strictly by calendar time — adjust as sprints dictate, but don't skip ahead
to a later phase's work while an earlier phase's foundation is incomplete.

## Phase 0 — Foundation
- Repo scaffold, Next.js 15 App Router project structure per
  `file-structure.md`
- Postgres provisioned; `pg.Pool` singleton; migration tooling in place
- Base schema migrated: `users`, `sessions`, `verification_tokens` (per
  `database-schema.md`)
- NextAuth wired with Credentials Provider + custom `pg` adapter (database
  session strategy)
- `middleware.ts` role-gating skeleton (even with only `customer`/`admin`
  live at first)
- Base Tailwind + shadcn/ui setup, placeholder brand tokens per
  `ui-context.md`

## Phase 1 — Public site + Customer core
- Public marketing pages: landing, how-it-works, FAQ, terms
- Public retailer/product browse (read-only)
- Customer registration, verification, login, profile, saved addresses
- Retailer/product browse (authenticated) reusing public data layer
- Schema: `customers`, `addresses`, `retailers`, `products`

## Phase 2 — Ordering + simulated payments
- Order placement flow (`orders`, `order_items`)
- Order status state machine (`lib/orders/status.ts`)
- Simulated payment flow (`/api/payments/simulate`, `payments` table)
- Customer order history + tracking view (polling or SSE)
- Order cancellation (customer, while `placed`/`confirmed`)

## Phase 3 — Retailer dashboard
- Retailer login (reuses NextAuth/users infra)
- Retailer product/inventory CRUD, scoped to own `retailer_id`
- Retailer order queue: accept/reject
- Retailer earnings view (read-only)

## Phase 4 — Super Admin dashboard
- User management (view/suspend/ban across roles)
- Retailer approval workflow
- Cross-retailer product oversight
- Order assignment to retailer (manual reassignment path)
- Delivery agent **record** management (`delivery_agents` — contact-only,
  no login) — schema and CRUD, per `database-schema.md`
- Order assignment to agent record (`order_assignments`)
- Manual delivery status overrides (since agent portal is dormant)
- Payment records view + COD reconciliation

## Phase 5 — Hardening & MVP launch readiness
- Full RBAC review across all routes (not just pages) per `security.md`
- Error handling audit — consistent response shape, no leaked internals
- Basic analytics for admin (orders/day, revenue, top retailers) — nice to
  have if time allows, not a hard MVP requirement unless client confirms
- Client sign-off on brand assets → replace placeholder palette in
  `ui-context.md`
- Decide EN/FR scope for MVP (see `ui-context.md` localization note) and
  implement if in scope

## Explicitly deferred (post-MVP — do not start early)

- **Delivery agent portal**: `(agent)/*` pages, `/api/agent/*` real logic,
  agent registration/login. Schema already exists (`delivery_agents.user_id`
  nullable, `order_assignments`) so this ships without a migration — see
  `architecture.md`
- **Real payment integration**: MTN MoMo Open API, Orange Money Web Payment
  API — requires merchant/collection account setup with the providers,
  which the client should start in parallel since approval can take days.
  Code-side, only `lib/payments/momo.ts` / `orange.ts` need building against
  the existing `PaymentResult` contract
- **Live map-based delivery tracking**
- **Multi-retailer carts**
- **Native mobile app** (web is responsive-first for MVP)

## How opencode should use this file

- Before starting a task, check which phase it belongs to and confirm prior
  phases' foundations are actually in place (e.g. don't build order
  placement before the auth/session layer is working end-to-end)
- If a requested task belongs to a "deferred" item, flag it rather than
  building it silently
