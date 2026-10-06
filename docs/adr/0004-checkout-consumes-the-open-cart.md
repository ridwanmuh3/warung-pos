# Checkout consumes the open cart, idempotently

**Status:** accepted

A cart gains a terminal `checked_out` status. Checkout is keyed on the open cart: the first successful checkout creates the order and marks the cart `checked_out` in the same transaction; a retry against an already-checked-out cart returns the existing order instead of creating a second one.

**Why:** `createOrder` currently never touches the cart — clearing is client-side — so a slow-network retry or a second tab on the same account can settle the same basket twice: two paid orders, two stock deductions, one customer. PLANNING.md principle 5 explicitly demands "transaksi tidak bisa dobel".

**Considered options:** a client-generated idempotency token (rejected as the primary key: tokens require the client to be well-behaved; the open cart id is already a natural, server-visible unique key), and order+items+stock writes without the cart transition (rejected: leaves the double-settlement window open).

**Consequences:** order insert, line items, stock movements, and the cart status transition become one atomic transaction — no more partial-failure windows where stock moves exist for an order that doesn't. "Last write wins" still applies to cart *edits*; only checkout is strictly once.
