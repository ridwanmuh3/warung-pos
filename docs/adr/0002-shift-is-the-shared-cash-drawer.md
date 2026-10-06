# A shift is the tenant's shared cash drawer, not a person's work period

At most one shift per tenant is open at any time, enforced in `openShift`/`closeShift` by looking up the tenant's unclosed shift. Every order placed while a shift is open is attached to it (`orders.shiftId`), regardless of which user rang it up.

**Why:** a warung has one physical drawer. Whoever is behind the counter at a given moment sells out of the same float, and the end-of-day question is "does the cash in the drawer match what the book says?" — a property of the drawer, not of any person. Per-cashier shifts would model a multi-register shop this product does not have.

**Considered options:** per-user shifts (rejected: implies one drawer per cashier, and forces a shift handover flow the warung doesn't practice).

**Consequences:** accountability for individual sales comes from `orders.userId` (the account) and `orders.cashier` (the free-text receipt name), *not* from the shift. Do not "fix" the single-open-shift constraint by scoping shifts to users without also redesigning how `expectedCash` is computed — the expected-cash math assumes one drawer. Known gap: voiding a cash order after its shift has closed takes money from the current drawer with no expected-cash adjustment (see CONTEXT.md open questions).
