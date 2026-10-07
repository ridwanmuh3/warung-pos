# Warung POS

Point-of-sale for Indonesian warung (small food shops): a cashier rings up orders against a product catalog, pays out of a shared cash drawer, and the owner reads daily sales and profit reports. Multi-tenant: each shop is a Tenant with its own catalog, orders, and counters.

## Language

### People & tenancy

**Tenant**:
One shop. Every business row belongs to exactly one tenant; no read or write crosses tenant boundaries.
_Avoid_: shop, store, account, org

**User**:
A login identity (email + password). A user belongs to one or more tenants through a Membership.
_Avoid_: account, cashier (see below)

**Membership**:
The join between a User and a Tenant, carrying a Role (`owner`, `manager`, `cashier`). Roles gate server functions, not just UI.
_Avoid_: permission, invite

**Cashier (display name)**:
The free-text name stamped on an order for receipts (`orders.cashier`). It is *not* an identity — the accountable identity is the User. Do not use it for access control or auditing.
_Avoid_: operator, staff

### Sales

**Order**:
A completed sale: numbered, priced, and paid (or later voided). Line items are snapshots taken at sale time (name, price, cost, imageKey), so a later catalog edit can never rewrite history.
_Avoid_: transaction, purchase, bill

**Order Number**:
A per-tenant monotonic sequence (`ORD-001`, `ORD-002`, …) drawn from a dedicated counter. Numbers are never reused, even after a void.
_Avoid_: receipt number, invoice number

**Cart**:
A not-yet-paid basket being rung up, stored server-side per (tenant, user). Statuses: `open` (the one being rung up), `parked` (held aside under a label), and `checked_out` (terminal — converted into an Order). Checkout consumes the open cart exactly once, so a retry or second tab can never settle the same basket twice. Line items are snapshots, exactly like order items.
_Avoid_: basket, held order, draft order

**Channel**:
How the customer takes the order: `dine-in`, `bungkus` (takeaway), or `ojol` (online delivery).
_Avoid_: order type, service mode

**Payment Method**:
How the customer pays: `tunai` (cash), `qris`, or `transfer`.
_Avoid_: payment type, tender

**Void**:
Cancelling a paid order *while its shift is still open*, so it no longer counts in sales. A void restocks tracked inventory and, for `tunai` orders, reduces the open drawer's expected cash — the money never really left. Voids are idempotent and always carry a reason. Cancelling after the shift has closed is a Refund, not a void.
_Avoid_: delete, cancel

**Refund**:
Returning money for an order whose shift has already closed. A refund is recorded against the shift in which the cash actually leaves the drawer (reducing *that* drawer's expected cash), so a late cancellation never silently distorts variance. Like a void, it restocks tracked inventory and carries a reason.
_Avoid_: void (see above), chargeback

**Discount**:
A rupiah amount subtracted from an order's subtotal, clamped so a total never goes negative. The original mode (percent vs. absolute) is *not* retained.
_Avoid_: promo, voucher

### Money & reporting

**HPP (cost)**:
The purchase price of a product, in whole rupiah. Snapshotted onto every line item at sale time so historical margin never shifts when cost is edited.
_Avoid_: COGS, modal (in code)

**Net Revenue**:
Sum of `order.total` (subtotal − discount) over paid orders. This is what the daily report and Z-report call "Omzet".
_Avoid_: gross sales (see below)

**Gross Sales**:
Sum of `price × qty` over line items, before discount. Used by the per-category breakdown. Never mix with Net Revenue in one report without naming both.
_Avoid_: revenue

**Profit**:
`total − costTotal` for one order; summed over paid orders for a report. Gross profit after discount.
_Avoid_: margin (that is profit ÷ revenue, a percentage)

**Shift**:
One shared cash-drawer session per tenant: opened with a float (`openingCash`), closed with a counted amount. Only one shift per tenant is open at a time — it belongs to the *drawer*, not to a person. At close, `expectedCash` = float + cash sales − cash voided; `variance` = counted − expected.
_Avoid_: work shift, cashier session

### Inventory

**Stock-tracked Product**:
A product with a numeric `stock`. Sales decrement it, voids and refunds restore it. On-hand may go negative (see Oversell). A product with `stock: null` is *not stock-tracked*: it sells forever without inventory bookkeeping. These are different states, not "null means zero".
_Avoid_: inventory item

**Oversell**:
Selling more units of a stock-tracked product than are on hand. Policy: **warn-and-allow** — the cashier is warned but the sale completes, because warung stock counts are often stale and blocking a real sale costs money. On-hand goes negative rather than clamping at zero, so the ledger and on-hand always reconcile; a negative count reads as "you owe the shelf N units".
_Avoid_: backorder, negative inventory (as an error state — here it is legitimate)

**Stock Movement**:
One entry in the append-only ledger of stock changes (`sale`, `restock`, `adjust`, `void`, `refund`). The recorded delta is always the *true* delta applied to on-hand, so the sum of movements equals `products.stock`. The ledger is the audit trail; `products.stock` is the cached on-hand.
_Avoid_: stock log, inventory event

### Time

**Business Day**:
The calendar day a sale belongs to, for "today" views and daily reports. ⚠️ Currently resolved from the *server's* local clock (`startOfTodayIso`, `resolveReportingDay`), not the tenant's timezone — a known gap, not a definition to copy.
_Avoid_: date, calendar day

**Checkout Authority**:
The server, not the client, prices an order. At checkout the server re-derives each line's price and HPP from the live catalog and computes subtotal, discount, total, and change itself; client-sent prices are display-only hints. A crafted request cannot set its own prices.
_Avoid_: client-computed total

## Open questions

Terms not yet resolved — decide these before building on them:

- **Business Day** anchoring: "today" is still resolved from the server's clock, not the tenant's timezone (see Business Day above). Needs a tenant-level timezone setting.
