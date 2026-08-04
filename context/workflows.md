# Workflows — MAGAS

## 1. Registration & login

1. Customer/retailer submits registration form → `/api/auth/register`
   validates via Zod, hashes password, inserts `users` row (+ `customers` or
   `retailers` row)
2. Verification token issued (`verification_tokens`), sent via email/SMS
3. User verifies → `status` flag or `email_verified_at` set (implementation
   detail: pick one and be consistent — see `database-schema.md` if adding
   this column)
4. User logs in via NextAuth Credentials Provider → `authorize()` checks
   credentials against `users` → session created (database strategy)
5. Session carries `role` + relevant scoping ID for the rest of the app

## 2. Browsing & retailer selection

1. Customer (or public visitor) views retailer list —
   `/api/public/retailers` or `/api/customer/retailers`
2. Selects a retailer → views that retailer's products
   (`/api/public/retailers/:id/products` or authenticated equivalent)
3. Product detail shows brand, cylinder size, price, availability — pulled
   live from `products`, not cached client-side beyond normal Next.js
   revalidation

## 3. Placing an order

1. Customer selects product(s) from **one retailer** (multi-retailer carts
   are out of scope — see `project-overview.md`)
2. Customer specifies delivery address (existing saved address or new one)
   and payment method (`cod | momo | orange`)
3. `POST /api/customer/orders`:
   - Validates input via Zod
   - Opens a transaction: inserts `orders` row (`status: 'placed'`), inserts
     `order_items` rows, snapshotting `price_at_order`
   - If `payment_method` is `momo` or `orange`: calls the **simulated**
     payment flow (see workflow 5) before or after order creation, per the
     chosen UX (recommend: create order first with `payments.status:
     'pending'`, then simulate)
   - If `cod`: inserts `payments` row with `status: 'pending'`, no
     simulation call needed
   - Commits transaction
4. Customer receives confirmation (in-app; SMS/email notification is a
   nice-to-have, not required for MVP)

## 4. Order status progression

Single source of truth: `lib/orders/status.ts`.

```
placed → confirmed → assigned → out_for_delivery → delivered
   ↓          ↓
cancelled   failed
```

- **placed → confirmed**: retailer action
  (`POST /api/retailer/orders/:id/accept`) or **placed → cancelled/failed**
  (`.../reject`, or customer cancel while still `placed`)
- **confirmed → assigned**: admin action only for MVP
  (`POST /api/admin/orders/:id/assign-agent`), assigning to a
  `delivery_agents` record (contact-only, no agent login yet)
- **assigned → out_for_delivery → delivered**: for MVP, since the agent
  portal doesn't exist, these transitions are also admin-triggered manual
  overrides (`.../override-status`) until the agent portal ships — do not
  invent an automatic transition here
- Every transition must go through the shared state machine function, which
  validates that the attempted transition is legal from the current state —
  reject illegal transitions (e.g. `delivered → confirmed`) at the function
  level, not just in the UI

## 5. Simulated payment flow (MVP)

1. Order placed with `payment_method: 'momo'` or `'orange'`
2. Client (or server, depending on final UX decision) calls
   `POST /api/payments/simulate` with `{ orderId, method, amount }`
3. Handler introduces an artificial delay (to mimic a real provider round
   trip), then:
   - Writes/updates a `payments` row with a fake `provider_ref` and
     `status: 'success'` (or `'failed'`, useful for testing failure-state UI)
   - On success, does **not** by itself change `orders.status` — payment
     status and order status are separate concerns; a retailer still must
     confirm the order per workflow 4
4. **Post-MVP swap-in:** when real MoMo/Orange Money integration is built,
   only `lib/payments/momo.ts` / `orange.ts` need real provider SDK calls
   implementing the same `PaymentResult` contract
   (`{ status, providerRef }`) — no changes needed to order flow, UI, or
   admin reconciliation views. `/api/payments/momo` and
   `/api/payments/orange` are reserved paths for this later phase.
5. Cash on Delivery is not "simulated" — it's genuinely manual: `payments`
   row starts `pending`, and admin marks it reconciled
   (`POST /api/admin/payments/:id/reconcile`) once delivery is confirmed and
   cash is physically collected.

## 6. Retailer order handling

1. Retailer views assigned orders (`GET /api/retailer/orders`)
2. Accepts (`confirmed`) or rejects (with reason; admin is notified so they
   can reassign to a different retailer — reassignment is an admin action,
   not automatic)

## 7. Admin oversight

1. Admin views all orders, filterable by status/retailer/date
2. Assigns unconfirmed/confirmed orders to retailers where needed (e.g. if
   the customer's chosen retailer rejected, admin reassigns)
3. Assigns confirmed orders to a delivery agent record
4. Manually progresses delivery status (workflow 4) since the agent portal
   is dormant
5. Reconciles COD payments; reviews simulated MoMo/Orange payment records
6. Manages retailer approval queue, user suspension, and delivery agent
   contact records

## 8. Agent workflow — NOT IMPLEMENTED

There is currently no agent-facing workflow. If a task description implies
building one (e.g. "let the agent mark delivery as complete"), stop and
confirm scope before proceeding — this is a deliberate MVP boundary per
`architecture.md` and `security.md`.
