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
- **confirmed → assigned**: admin action only
  (`POST /api/admin/orders/:id/assign-agent`), assigning to a
  `delivery_agents` record
- **assigned → out_for_delivery → delivered**: agent self-service, scoped to
  the agent's own assignment (`lib/actions/agent.ts`). Admin retains a manual
  override path for the same transitions (`.../override-status`) for cases
  the agent can't act (e.g. no working phone) — both routes go through the
  same shared state machine, so neither can produce an illegal transition
- Every transition must go through the shared state machine function, which
  validates that the attempted transition is legal from the current state —
  reject illegal transitions (e.g. `delivered → confirmed`) at the function
  level, not just in the UI

## 5. Payment flow (NotchPay primary, Fapshi fallback)

1. Customer checks out (`lib/actions/checkout.ts`, `placeOrderAction`) with
   `payment_method: 'momo'` or `'orange'` — the `orders`, `order_items`, and
   a `payments` row (`status: 'pending'`) are written in one transaction,
   with a reference (`provider_ref`) generated *before* any provider is
   contacted, so a fast webhook can never race ahead of the row existing.
2. After the transaction commits, `lib/payments/charge.ts`'s `chargeOrder()`
   tries **NotchPay** first; only if NotchPay is unavailable (network/
   timeout/5xx/auth failure — never a clean decline) does it fall through
   to **Fapshi**. Whichever provider is used gets recorded on the payment
   row (`payments.provider`).
3. Resolution arrives one of two ways: a webhook
   (`app/api/payments/notchpay/route.ts` or `.../fapshi/route.ts`,
   signature-verified, deliberately unauthenticated per `middleware.ts`'s
   comment there), or a client-side poll fallback
   (`pollPaymentStatusAction`, `components/dashboard/payment-status-poller.tsx`)
   in case a webhook is delayed or missed. Either path calls
   `updatePaymentStatus()`, which is idempotent (`WHERE status = 'pending'`)
   so a repeat webhook is a safe no-op.
   - On success, this does **not** by itself change `orders.status` —
     payment status and order status stay separate concerns; a retailer
     still must confirm the order per workflow 4.
   - On failure (both providers), the order stays `placed` and the
     customer gets a **"Retry payment"** affordance
     (`retryPaymentAction`) that inserts a *new* `payments` row rather
     than mutating the failed one, preserving full attempt history.
4. Dev-only fake processor: set `PAYMENTS_MODE=simulate` to route through
   `lib/payments/simulate.ts` instead of real provider calls (artificial
   delay, 95% success rate) — useful before sandbox credentials are
   provisioned. Never set in production.
5. Cash on Delivery is not simulated or provider-routed — it's genuinely
   manual: `payments` row starts `pending`, and admin marks it reconciled
   (`reconcilePaymentAction`, COD-and-pending enforced server-side) once
   delivery is confirmed and cash is physically collected.

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
4. Can manually override delivery status (workflow 4) if an agent can't do
   it themselves
5. Reconciles COD payments; reviews simulated MoMo/Orange payment records
6. Manages retailer approval queue, user suspension, delivery agent contact
   records, and delivery agent login invites (`inviteAgentAction`)

## 8. Agent workflow

1. Admin invites an existing `delivery_agents` contact to a login
   (`inviteAgentAction`); the agent sets their own password at
   `/agent-invite/[token]` and signs in
2. Agent views their assigned orders — active and history — on `/agent` and
   `/agent/orders`
3. Agent progresses their own assignments through
   `assigned → out_for_delivery → delivered` (or `→ failed`) from
   `/agent/order/[orderId]`, scoped to their own `delivery_agents.id`
   (`lib/actions/agent.ts`)
