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

## Phase 2 — Ordering + payments
- Order placement flow (`orders`, `order_items`, `lib/actions/checkout.ts`)
- Order status state machine (`lib/orders/status.ts`)
- Real payments via NotchPay (primary) + Fapshi (fallback), both
  verified against each provider's own docs (`developer.notchpay.co`,
  `docs.fapshi.com`) —
  `lib/payments/{notchpay,fapshi,charge}.ts`, webhook receivers
  (`app/api/payments/{notchpay,fapshi}/route.ts`), poll fallback
  (`pollPaymentStatusAction`), `PAYMENTS_MODE=simulate` for dev without
  sandbox credentials
- Customer order history + tracking view (polling)
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
- Delivery agent record management (`delivery_agents`) — schema and CRUD,
  per `database-schema.md`
- Delivery agent login invites, linking a `delivery_agents` record to a
  `users` row via a one-time set-password link
- Order assignment to agent record (`order_assignments`)
- Manual delivery status override path, alongside agent self-service
- Payment records view + COD reconciliation

## Phase 4b — Delivery agent portal
- Agent login via admin-issued invite only (no public registration)
- Agent overview + assigned-order list (`/agent`, `/agent/orders`), active
  and history
- Agent self-service status updates on their own assignments
  (`assigned → out_for_delivery → delivered`, or `→ failed`), through the
  shared `lib/orders/status.ts` state machine

## Phase 4c — Live delivery tracking (Google Maps)
- Coordinates: `latitude`/`longitude` on `delivery_agents` (current
  position, no history), `addresses` and `retailers` (captured via Google
  Places Autocomplete at entry time), `delivery_latitude`/`delivery_longitude`
  on `orders`
- Agent-side: explicit opt-in "Share my location" toggle on the order-detail
  page, `navigator.geolocation.watchPosition` → `updateAgentLocationAction`
- Customer-side: `DeliveryMap` on the order-detail page while
  `out_for_delivery`, polling `getAgentLocationAction` every ~15s — no
  route line or ETA (no Directions API) in this pass
- Requires a Google Cloud project with billing enabled and Maps
  JavaScript API + Places API turned on — see `.env.example` for the two
  API keys needed

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

- **Multi-retailer carts**
- **Native mobile app** (web is responsive-first for MVP)

## How opencode should use this file

- Before starting a task, check which phase it belongs to and confirm prior
  phases' foundations are actually in place (e.g. don't build order
  placement before the auth/session layer is working end-to-end)
- If a requested task belongs to a "deferred" item, flag it rather than
  building it silently
