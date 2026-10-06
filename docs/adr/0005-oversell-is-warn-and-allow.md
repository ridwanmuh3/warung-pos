# Oversell policy is warn-and-allow, with negative on-hand

**Status:** accepted

A cashier may sell more units of a stock-tracked product than are on hand. The UI warns when quantity exceeds on-hand, but the sale completes. `products.stock` goes **negative** instead of clamping at zero, and the stock-movement ledger always records the true delta applied.

**Why:** warung stock counts are chronically stale — a delivery arrives and goes straight to the shelf before anyone keys it in. Blocking the sale (the strict alternative) stops a real transaction in front of a queueing customer over a bookkeeping lag. Allowing silently (the lax alternative) forfeits the cashier's chance to catch a mis-keyed quantity. Warning preserves both the sale and the signal.

**Considered options:** block at checkout (rejected above); allow silently (rejected above); clamp at zero (rejected: it makes the ledger and on-hand permanently diverge — today's `Math.max(0, …)` in `applyStockDelta` means a sale of 5 against 2 on-hand records −5 in the ledger but only −2 on the shelf, and no report can ever explain the difference).

**Consequences:** a negative on-hand count is a legitimate state meaning "you owe the shelf N units", and restocking absorbs the deficit naturally. Any UI that displays stock must render negatives honestly rather than flooring at zero. Low-stock warnings should treat `stock < threshold` (negatives included) as low.
