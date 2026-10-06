# Order and cart line items are sale-time snapshots

Every row written to `order_items` (and `cart_items`) copies `name`, `emoji`, `price`, and `cost` (HPP) from the product at the moment of sale. Line items never reference the live catalog for display or math.

**Why:** a warung edits its catalog constantly — prices rise, costs change, products are recategorized or deleted. If orders joined back to the catalog, editing a product would silently rewrite every historical receipt, margin report, and Z-report. Snapshots make history immutable by construction.

**Considered options:** joining to the catalog at read time (rejected: history mutates), and a full product-versioning scheme (rejected: far more complexity than a warung needs).

**Consequences:** catalog edits never reach old orders — this is deliberate, not a bug; do not "fix" stale-looking receipts. The trade-off is that any dimension *not* snapshotted still rewrites history: category is currently looked up from the live catalog in `summarizeCategories`, so recategorizing a product changes past category reports, and deleting one drops its sales from the breakdown entirely.
