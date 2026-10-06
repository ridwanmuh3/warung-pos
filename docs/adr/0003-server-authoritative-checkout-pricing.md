# Checkout pricing is server-authoritative

**Status:** accepted

At checkout the server re-derives every line item's price and HPP from the live catalog and computes subtotal, discount, total, and change itself. Client-sent prices and totals are display hints only and are never persisted as-is.

**Why:** the current flow trusts `orderItemSchema`-validated client prices (any `price >= 0`), so a crafted request can ring up a Rp100 nasi goreng and the server's own recomputation certifies it. "Uang tidak boleh hilang" (PLANNING.md, principle 5) cannot hold while the client sets prices.

**Considered options:** trusting the cart snapshots the server already holds (rejected as the sole source: parked carts legitimately hold old prices, and silently charging a stale price is worse than repricing openly), and rejecting the checkout when any price has drifted (rejected: too brittle for a queueing cashier).

**Consequences:** the cart-snapshot philosophy (ADR-0001) becomes a *display* guarantee — the parked price is what the cashier sees — while the charged price is the catalog price at checkout. When the two differ, the UI should surface the drift rather than hide it. Price changes mid-queue now take effect immediately for new checkouts.
