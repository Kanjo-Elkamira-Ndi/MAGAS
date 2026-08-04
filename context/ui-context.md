# UI Context — MAGAS

## Stack

- Tailwind CSS (utility classes only, no inline styles)
- shadcn/ui as the component primitive library — use existing primitives
  (`Button`, `Dialog`, `Input`, `Select`, `Card`, `Table`, `Badge`, etc.)
  before building a custom one from scratch
- Icons: `lucide-react`

## Brand

> Client has not yet supplied final brand colors/logo for MAGAS. Until
> provided, use a neutral placeholder palette below and flag to the client
> that final brand assets are needed before public launch — do not invent
> and lock in a permanent brand color without sign-off.

**Placeholder palette (swap out when brand assets arrive):**
- Primary: a blue (e.g. `#2563EB` / Tailwind `blue-600`) — gas/utility
  services commonly use blue or orange in this market; either is a safe
  placeholder
- Neutral grays: Tailwind's default `slate` scale
- Success: `green-600` (order delivered, payment success)
- Warning: `amber-500` (pending payment, pending approval)
- Danger: `red-600` (failed order, rejected, banned)

## Layout patterns by actor

- **Public site:** marketing layout — hero, feature sections, retailer
  preview grid, footer with links. Optimized for SEO (semantic HTML,
  metadata per page)
- **Customer:** simple dashboard shell — top nav, order status front and
  center, retailer/product browsing as a card grid
- **Retailer:** dashboard shell with sidebar — orders queue as the default
  landing view (this is their most frequent task), product management as a
  table with inline edit
- **Admin:** dense dashboard shell with sidebar — tables with filters for
  users/orders/payments; this is an operational tool, prioritize
  scannability and bulk actions over marketing polish
- **Agent (scaffolded):** do not design real screens yet — a single
  "coming soon" placeholder is sufficient

## Order status badges

Use a consistent `<StatusBadge>` shared component (in
`components/shared/`) across customer, retailer, and admin views so status
colors never drift between actors:

| Status | Color |
|---|---|
| Placed | slate |
| Confirmed | blue |
| Assigned | blue |
| Out for Delivery | amber |
| Delivered | green |
| Cancelled | slate (muted) |
| Failed | red |

## Forms

- All forms use Zod schemas shared with the backend (`lib/validation/`) via
  a resolver, so client and server validation never disagree
- Standard form components come from shadcn/ui `Form` primitives — don't
  hand-roll form state management outside this pattern
- Never use HTML `<form>` native submission for anything that should be a
  Server Action or fetch-based mutation with pending/error UI

## Accessibility

- Every interactive element keyboard-navigable and screen-reader labeled
  (shadcn/ui primitives handle most of this by default — don't override
  their ARIA attributes)
- Color is never the only signal for status — pair `<StatusBadge>` color
  with a text label always

## Localization note

- Client's other platforms (YouthTrend) default to bilingual EN/FR. Confirm
  with the client whether MAGAS needs EN/FR from MVP or can launch
  French-only / English-only first — do not assume; this affects whether
  `next-intl` (or similar) should be wired in from the start or deferred
