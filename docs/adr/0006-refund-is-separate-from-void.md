# Refund is a separate domain event from Void

**Status:** accepted

**Void** cancels a paid order *while its shift is still open* — the money arguably never left the drawer, so expected cash simply drops the sale. **Refund** returns money for an order whose shift has already closed, and is recorded against the shift in which the cash physically leaves the drawer, reducing *that* drawer's expected cash.

**Why:** today, voiding a `tunai` order after its shift has closed hands cash out of the current drawer while no shift's `expectedCash` accounts for it — the current drawer's variance is wrong by exactly the refund, with no explanation anywhere. One word ("void") was hiding two different cash movements.

**Considered options:** keeping a single void concept and back-adjusting the closed shift (rejected: rewriting a closed shift's expected cash destroys the value of closing it, and the cash demonstrably did not leave that drawer), and refusing late cancellations entirely (rejected: customers do come back with complaints).

**Consequences:** order status gains a third value (`refunded`) alongside `paid`/`void`, and stock movements gain a `refund` reason. Restocking happens in both paths. Reporting treats voided and refunded orders identically for sales totals (neither counts) but differently for cash (refunds hit the refunding shift, voids hit the original shift). The daily report should show refunds as their own line so a variance has a visible cause.
