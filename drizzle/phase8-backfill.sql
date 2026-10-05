-- Phase 8 tenant backfill for a database that already holds data.
--
-- Run this AFTER the structural change (drizzle-kit push, or the generated
-- migration on a fresh database). It is idempotent: running it twice changes
-- nothing. It maps all pre-multi-tenant rows onto one shared default shop and
-- makes every existing account its owner.
--
--   pnpm db:push                 -- apply the new schema (adds tenant_id, carts, ...)
--   # then, against the same database:
--   sqlite3 ... < drizzle/phase8-backfill.sql
--
-- Order numbers are never reused: the counter is lifted to the highest number
-- already present so a later sale cannot collide with an imported order.

INSERT OR IGNORE INTO tenants (id, name, created_at)
VALUES ('warung-saya', 'Warung Saya', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- Every existing user becomes the owner of the default shop.
INSERT OR IGNORE INTO memberships (id, tenant_id, user_id, role, created_at)
SELECT 'mig-' || id, 'warung-saya', id, 'owner', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM users;

-- Claim every legacy row for the default shop.
UPDATE products SET tenant_id = 'warung-saya' WHERE tenant_id IS NULL;
UPDATE orders SET tenant_id = 'warung-saya' WHERE tenant_id IS NULL;
UPDATE shifts SET tenant_id = 'warung-saya' WHERE tenant_id IS NULL;
UPDATE stock_movements SET tenant_id = 'warung-saya' WHERE tenant_id IS NULL;

-- Lift the order counter to the highest existing number (never lower it).
INSERT INTO counters (tenant_id, key, value)
VALUES (
  'warung-saya',
  'order_number',
  (SELECT COALESCE(MAX(CAST(substr(order_number, 5) AS INTEGER)), 0) FROM orders)
)
ON CONFLICT (tenant_id, key)
DO UPDATE SET value = MAX(counters.value, excluded.value);
