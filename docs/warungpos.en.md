# Warung POS — A Point of Sale for Indonesian Warungs

A web-based cashier workflow that connects sales, stock, the shared cash drawer, and daily reports. It favors explicit accounting rules over a pile of disconnected CRUD screens.

| | |
| --- | --- |
| **Type** | Full-stack project / engineering showcase |
| **Role** | Solo — product flow, UI, domain rules, backend, data model, tests |
| **Stack** | React 19 · TanStack Start / Router · TypeScript · Tailwind CSS 4 · Turso / libSQL · Drizzle ORM · Cloudflare R2 · Xendit |
| **Status** | Implemented application; payment integration needs end-to-end verification before relying on live money |
| **Repo** | [`warung-pos`](https://github.com/ridwanmuh3/warung-pos) |

---

## 1. Project Overview

A small shop can make a sale in seconds and still spend the evening reconciling three separate records: what was sold, what remains on the shelf, and what should be in the drawer. Warung POS gives those records one operational flow. A cashier selects products, accepts payment, and issues a receipt; an owner sees sales, cost, outstanding customer credit, and the difference between expected and counted cash.

The hard part is not displaying a total. It is keeping distinct facts distinct: **a sale is not the same as money received**, **stock on hand is not always an authoritative limit**, and **an order marked void after closing a drawer is not the same as money refunded from a later drawer**. The app models these differences explicitly rather than trying to infer them from a single payment label.

The core design uses a server-authoritative checkout. A browser cart stays responsive and survives reloads, but the server re-reads product prices and costs, calculates the total, consumes the open cart, numbers the order, and records stock movement. A unique `orders.cart_id` prevents a repeated checkout of the same cart from creating a second sale.

### At a glance

| Dimension | Implementation |
| --- | --- |
| Application | One TanStack Start app: public marketing site plus authenticated POS |
| Tenancy | One tenant per warung; users join through `owner`, `manager`, or `cashier` memberships |
| Checkout | Cash, Xendit QRIS when configured, and customer credit (`Ngutang`) |
| QRIS | Fixed-amount payment request, pending order, webhook, status check, QR renewal/cancellation |
| Inventory | Tracked stock or `null` for untracked; stock movements retain the change history |
| Cash | One shared drawer shift per tenant; opening float, expected cash, counted cash, variance |
| Reporting | Daily revenue and profit, payment mix, best sellers, busy hours, CSV and Z-report |
| Verification | Vitest suites, TypeScript, oxlint, tenant-scoping and import-boundary checks |

### Intentionally limited

This is a working application, not a claim that a shop can safely move live money without deployment validation. Checkout needs a server connection; it is not an offline POS. A test-mode QR does not prove that production QR issuance and callback delivery work in a live Xendit account. Credit settlement is recorded in full, not in installments. A browser print dialog handles receipts; there is no direct thermal-printer integration. No load benchmark, multi-region availability, or production service-level claim is made.

---

## 2. Features

### Cashier workflow

- **Find and ring up products** — search by name, SKU, or barcode; a keyboard-wedge scanner can send a code followed by Enter. Category filters and low-stock labels help navigation.
- **Responsive cart** — local-first interactions survive refresh; the open cart is synced to the server, and a cart can be parked and resumed. A changed catalog price is surfaced before checkout.
- **Cash checkout** — quick tender amounts, automatic change, nominal or percentage discount, and a receipt printable through the browser.
- **Dynamic QRIS** — when configured, Xendit creates a fixed-amount QR for a pending order. The pending screen polls local payment state and offers a direct provider status check, regeneration, or cancellation. A sandbox simulation action appears only with a test key.
- **Customer credit** — `Ngutang` records a completed sale with an unsettled balance and customer name. Later settlement records the method and, for cash, the drawer receiving it. Revenue is recognized once at sale time; outstanding credit is shown separately.
- **Order context** — channel (`dine-in`, `takeaway`, `delivery`) and optional cashier display name appear on receipts and in history.

### Owner and manager workflow

- **Catalog and stock** — manage prices, purchase costs (HPP), optional stock counts, restock thresholds, SKU, barcode, and product images in Cloudflare R2. Every tracked stock adjustment writes a movement.
- **Shared drawer** — open with a float, then close against physical cash. Expected cash counts cash sales and relevant cash settlements or refunds, not every transaction labeled as revenue.
- **Daily reporting** — revenue, cost, gross profit after discount, margin, sales by method and category, top products, busy hours, channel breakdown, and a seven-day trend. Export CSV or a printable Z-report.
- **Corrections with history** — void a paid sale while its original shift is open; after that shift closes, record a refund against the drawer that pays it out. Restore tracked stock and retain the original order and reason.
- **Team access** — an owner manages memberships; server-side role checks gate actions. A user may belong to more than one tenant.

### Platform behavior

- **Public marketing, private POS** — the homepage renders without a session; authenticated routes resolve an encrypted, HTTP-only cookie and enforce membership on the server.
- **Onboarding without fake sales** — a new owner sees an empty catalog and a setup checklist instead of seeded transactions.
- **Legacy-data recovery** — an explicit import path helps move older browser-held data into the tenant-backed database.
- **Browser-first product images** — the server signs uploads to R2; image reads go through the app's same-origin `/img` proxy by default.

---

## 3. Tech Stack

| Layer | Technologies | Why it is here |
| --- | --- | --- |
| **UI and routing** | React 19, TypeScript, TanStack Start / Router | SSR for public pages, typed routes and loaders for the POS, server functions for mutations |
| **Styling and motion** | Tailwind CSS 4, Tabler Icons, CSS animations, GSAP | Mobile and desktop UI; CSS entrances work before the optional scroll-motion runtime loads |
| **Domain and validation** | Pure TypeScript rules, Zod 4 | One place for pricing, payment lifecycle, drawer and reporting rules; validation at the server boundary |
| **Data** | Turso / libSQL, Drizzle ORM, SQLite schema | Transactional orders, carts, stock movements, memberships and payment attempts in one database |
| **Payments** | Xendit Payments API v3, webhook route, `qrcode.react` | Fixed-amount QRIS creation and display; asynchronous settlement and manual reconciliation |
| **Images** | Cloudflare R2, presigned uploads | Product images without routing file uploads through the app server |
| **Deployment** | Vite, Netlify Functions | Full-stack build and server-side routes on one origin |
| **Checks** | Vitest, TypeScript, oxlint, repository guard scripts | Pure rule tests, integration tests, type checks, tenant-scoping and import-boundary checks |

---

## 4. Architecture

### System shape

Warung POS is a modular monolith, not a network of services. The browser talks to the TanStack Start origin. Route loaders and server functions call tenant-aware data modules; those modules use Drizzle against libSQL. Payment creation and reconciliation call Xendit from the server, while product-image uploads go straight to R2 using server-signed requests.

```text
Browser → TanStack routes / server functions → domain rules + tenant-scoped data → Turso
                                      ├→ Xendit payment requests
Xendit → /api/xendit/callback ────────┘
Browser → signed PUT → Cloudflare R2; image reads → /img proxy → R2
```

| Boundary | Responsibility |
| --- | --- |
| `src/routes/` | Public pages, authenticated routes, loaders, callback endpoint |
| `src/features/` | Checkout, catalog, sales and shift screens with their server functions |
| `src/domain/` | Pure pricing, sales lifecycle, drawer, reporting, and business-day rules |
| `src/lib/data/*.server.ts` | Tenant-aware SQL and transactions; some legacy infrastructure remains in `src/lib/` |
| `src/db/schema.ts` | Tables, indexes and relational constraints |
| `src/server/payments/xendit.server.ts` | Xendit wire format, authentication, QR request and status calls |

### A checkout and its payment

1. Browser updates its local cart; cart sync persists the open cart for the signed-in user and tenant.
2. Checkout flushes that cart. Server reads current product prices and HPP, validates the request, computes amounts, and atomically creates an order while consuming the cart and recording tracked stock changes.
3. Cash and credit settle in the application immediately, with different money semantics. QRIS instead creates a `pending` order and requests a QR from Xendit. Pending sales do **not** count as paid revenue.
4. Xendit returns a `QR_STRING` action for display; the cashier presents that QR. The callback verifies its token and matches a globally unique `reference_id` to the stored payment attempt, rather than trusting a tenant ID from the webhook body.
5. A successful capture with the expected amount marks the payment and order paid. Polling the app's stored state handles normal waiting; the explicit status check asks Xendit directly when a callback is delayed or lost.

QR creation and callback delivery are separate steps. Configuring a callback alone does not make a QR appear: the initial provider request must succeed and return a QR string.

### Consistency and failure handling

| Case | Behavior and limit |
| --- | --- |
| Repeated checkout / second tab | `orders.cart_id` is unique; checkout reuses the order for an already consumed cart |
| Product price changed | Server prices from current catalog; UI warns about stale cart prices |
| Oversell | Warn-and-allow: tracked stock may go negative because shelf counts can be stale; movement records the real delta |
| QR request fails | Order stays pending; attempt is marked failed; cashier can create a new QR or cancel without ringing items again |
| QR expires | Screen offers renewal or cancellation; a late confirmed payment can still settle an expired attempt |
| Callback duplicated or lost | Repeated signals must not duplicate settlement; manual provider reconciliation can repair a missed callback |
| Payment after cancellation | Not silently marked paid on a voided order; recorded as an anomaly requiring manual refund handling |
| Refund after shift close | Recorded against the drawer that pays it out; this is an internal cash/inventory correction, **not** an automatic Xendit refund |

---

## 5. Data Model

One libSQL database holds the shop's business data. The source of truth is [`src/db/schema.ts`](../src/db/schema.ts); older ERD text may not yet include the QRIS `payments` table.

| Entity | Business role |
| --- | --- |
| `users`, `tenants`, `memberships` | Global login identity, shop boundary, and role per shop |
| `products`, `stock_movements` | Catalog and append-only inventory changes; `stock = null` means untracked |
| `carts`, `cart_items` | One open cart per user context, parked carts and sale-time input snapshots |
| `orders`, `order_items`, `counters` | Numbered sales, immutable line snapshots, per-tenant monotonic order numbers |
| `shifts` | Shared drawer opening cash, counted cash, expected cash, and variance |
| `payments` | QRIS attempts: our reference, Xendit's ID, QR string, amount, expiry and status |

### Constraints that carry business meaning

| Constraint / rule | Purpose |
| --- | --- |
| `UNIQUE (tenant_id, order_number)` and `(tenant_id, key)` counters | Prevent number collisions and reuse after void |
| `UNIQUE (cart_id)` on `orders` | One cart becomes at most one order |
| `UNIQUE (tenant_id, user_id)` on `memberships` | One role per user within each shop |
| `UNIQUE (tenant_id, sku)` and `(tenant_id, barcode)` | Avoid duplicate product codes within a shop, not across shops |
| `UNIQUE (reference_id)` on `payments` | Resolve callbacks to the right attempt without accepting a caller-supplied tenant |
| Exact integer-rupiah amount match before QRIS settlement | A mismatched capture never silently pays an order |

Line items store name, image key, price and HPP snapshots so a later catalog edit cannot rewrite a past receipt or profit calculation. Money uses whole rupiah. Every `tenant_id` column is `NOT NULL`; isolation is enforced by tenant-filtered server queries and their tests, not by database row-level security. Some references are deliberately soft (text without foreign keys).

---

## 6. Trade-offs

| Decision | What it buys | What it costs | How it is contained |
| --- | --- | --- | --- |
| **One full-stack app** instead of microservices | Short path from cashier UI to a transactional sale | App and database share failure and scaling boundaries | Feature/domain split; server-only modules |
| **Local-first cart, server-authoritative checkout** | Fast interaction and reload survival without trusting browser prices | Sync and stale-price cases need care; no offline checkout | Flush before payment, reprice on server, unique cart-to-order constraint |
| **Warn-and-allow oversell** | Real sale proceeds despite stale shelf count | Stock can become negative | Visible warning and exact movement ledger; review shortages later |
| **Async Xendit QRIS** | Fixed amount per order and confirmation from provider | QR creation, expiry, delayed callbacks, and manual exceptions | Pending attempts, status check, renewal and recorded anomalies |
| **Manual post-close refund records** | Drawer and inventory stay explainable without a second payment integration | Does not send money back through Xendit | Documented distinction; external refunds require an operator workflow |
| **Single shared drawer per tenant** | Clear cash variance independent of which user rang up a sale | Cannot represent multiple concurrent physical drawers | One open shift per tenant in application logic |
| **Server-clock business day** | One consistent reporting clock in current code | Shop timezone may differ from server timezone | Clock-injected domain helpers; tenant timezone remains an open requirement |
| **Per-process login rate limits** | Basic protection without another service | Limits do not aggregate across serverless instances | Shared limiter or WAF needed for broader deployments |

### Before depending on it for live operations

- Verify QR issuance, real callback delivery, settlement, expiry, and exceptions end-to-end in the target Xendit account. In particular, a configured API key and callback do not prove that a scannable QR is being returned.
- Define a provider refund workflow for QRIS payments; the present order refund records internal state and drawer effects, not a provider-initiated refund.
- Add tenant-local timezone handling and a shared rate limiter or WAF if the deployment spans instances.
- Exercise backups, migrations, restore, and deployment smoke checks against a separate environment. No high-availability or load-test result is claimed here.

---

## 7. Conclusion

Warung POS is built around a practical invariant: **a cashier may finish the sale quickly, but the records must still explain what happened to stock, receivables, and cash.**

The cart can be fast without being trusted as the price authority. An order can count as a sale while its credit remains unpaid. A pending QRIS request can reserve stock without claiming revenue. A void and a later refund can both correct a sale while recording different cash-drawer effects. These distinctions are why the application has separate orders, payment attempts, stock movements, shifts, and credit-settlement fields rather than a single mutable “paid” flag.

It remains a bounded project: real payment readiness, timezone handling, and operational recovery need deployment-level proof. The architecture makes those limits visible instead of treating a working screen as proof that the underlying money flow is complete.

### Further reading

- [`README.md`](../README.md) — setup and feature overview (some payment copy predates Xendit integration)
- [`CONTEXT.md`](../CONTEXT.md) — shared domain language and known business-day gap
- [`src/db/schema.ts`](../src/db/schema.ts) — current schema, including payment attempts
- [`docs/architecture.md`](architecture.md) — architecture and tenant boundaries (some paths predate feature split)
- [`docs/erd.md`](erd.md) — core entity relationships (payment attempts not yet drawn)
- [`docs/adr/`](adr/) — decisions on snapshots, checkout, stock and refunds
