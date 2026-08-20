# API Reference — MAGAS

All routes are Next.js **Route Handlers** (`app/api/**/route.ts`) unless a
Server Action is explicitly noted. Base path: `/api`. All authenticated
routes read the session via NextAuth's `auth()` helper — no route trusts a
client-supplied role or ID. **One deliberate exception**: the payment
provider webhooks below have no session at all (an external service is
calling in) and instead trust a verified request signature — see
`security.md`.

Response shape (all routes):
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "STRING_CODE", "message": "..." } }
```

## Auth — `/api/auth/*`

| Route | Method | Notes |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handler — login, session, logout |
| `/api/auth/register` | POST | Custom — creates a `users` row (role: customer or retailer), outside NextAuth |
| `/api/auth/verify` | POST | Consumes a `verification_tokens` entry (email/phone verify) |
| `/api/auth/forgot-password` | POST | Issues a reset token |
| `/api/auth/reset-password` | POST | Consumes reset token, updates `password_hash` |

## Public — `/api/public/*` (no auth)

| Route | Method | Notes |
|---|---|---|
| `/api/public/retailers` | GET | List approved, active retailers |
| `/api/public/retailers/:id/products` | GET | Read-only product listing for a retailer |

## Customer — `/api/customer/*` (role: customer)

| Route | Method | Notes |
|---|---|---|
| `/api/customer/profile` | GET, PATCH | View/update own profile |
| `/api/customer/addresses` | GET, POST | List/add saved addresses |
| `/api/customer/addresses/:id` | PATCH, DELETE | Update/remove own address only |
| `/api/customer/retailers` | GET | Browse retailers (authenticated view, same data as public + order affordances) |
| `/api/customer/products` | GET | Browse products, filterable by retailer |
| `/api/customer/orders` | GET, POST | List own orders / place a new order |
| `/api/customer/orders/:id` | GET | View a single order's detail + status |
| `/api/customer/orders/:id/cancel` | POST | Cancel — only valid from `placed`/`confirmed` |
| `/api/customer/orders/:id/track` | GET | Polling endpoint for live status (or SSE variant) |

## Retailer — `/api/retailer/*` (role: retailer)

All queries scoped to `session.retailer_id` server-side — never trust an
`:id` param alone.

| Route | Method | Notes |
|---|---|---|
| `/api/retailer/profile` | GET, PATCH | Own business profile |
| `/api/retailer/products` | GET, POST | List/add own products |
| `/api/retailer/products/:id` | PATCH, DELETE | Update/remove — must own the product |
| `/api/retailer/orders` | GET | Orders assigned to this retailer |
| `/api/retailer/orders/:id/accept` | POST | Move `placed` → `confirmed` |
| `/api/retailer/orders/:id/reject` | POST | Reject with reason; admin notified |
| `/api/retailer/earnings` | GET | Read-only earnings/payout summary |

## Agent — `/api/agent/*` (**stubbed, not implemented**)

| Route | Method | Notes |
|---|---|---|
| `/api/agent/orders` | GET | Returns `501 Not Implemented` / `{ success: false, error: { code: "AGENT_PORTAL_NOT_AVAILABLE" } }` |
| `/api/agent/orders/:id/status` | POST | Same stub behavior |

> Do not implement real logic behind these routes without explicit
> instruction — see `architecture.md` and `security.md`.

## Admin — `/api/admin/*` (role: admin)

| Route | Method | Notes |
|---|---|---|
| `/api/admin/users` | GET | List/filter all users by role/status |
| `/api/admin/users/:id/suspend` | POST | Suspend/reinstate any user |
| `/api/admin/retailers` | GET, POST | List retailers / register one directly |
| `/api/admin/retailers/:id` | PATCH, DELETE | Update/remove |
| `/api/admin/retailers/:id/approve` | POST | Approve a pending retailer |
| `/api/admin/products` | GET, POST | Cross-retailer product oversight |
| `/api/admin/products/:id` | PATCH, DELETE | Admin override of any product |
| `/api/admin/orders` | GET | All orders, filterable by status/retailer/date |
| `/api/admin/orders/:id/assign-retailer` | POST | Manual retailer assignment |
| `/api/admin/orders/:id/assign-agent` | POST | Assigns to a `delivery_agents` record (dormant portal, admin-only path) |
| `/api/admin/orders/:id/override-status` | POST | Manual status override |
| `/api/admin/agents` | GET, POST | Manage `delivery_agents` records (contact-only, no login) |
| `/api/admin/agents/:id` | PATCH, DELETE | Update/remove agent record |
| `/api/admin/payments` | GET | All payment records, filterable |
| `/api/admin/payments/:id/reconcile` | POST | Mark COD payment as collected |

## Payments — `/api/payments/*`

Real `route.ts` files (unlike most of this document, which mostly describes
mutations that actually ship as Server Actions) — these have to be, since
an external payment provider needs a real URL to POST a webhook to.

| Route | Method | Notes |
|---|---|---|
| `/api/payments/notchpay` | POST | NotchPay webhook receiver (primary provider) — HMAC-SHA256 signed (`x-notch-signature`), unauthenticated by design |
| `/api/payments/fapshi` | POST | Fapshi webhook receiver (fallback provider) — `x-wh-secret` header checked, unauthenticated by design |

Charge initiation itself is a Server Action (`placeOrderAction` at
checkout, `retryPaymentAction` on the order page), not a route — see
`workflows.md` §5.

## Conventions for opencode when adding a route

- Validate the request body with a Zod schema from `lib/validation/` before
  touching the database
- Never build a raw SQL string by concatenation — always parameterized
  queries via `pg`
- Every authenticated route must call the session check first and return
  early on missing/invalid role — do not rely on `middleware.ts` alone for
  API routes, since middleware protects pages, not necessarily every API
  edge case
- Mutations that change order/payment status must go through
  `lib/orders/status.ts` and `lib/payments/` respectively, never inline
