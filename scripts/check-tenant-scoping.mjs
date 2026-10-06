import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Tenant-scoping guard (Phase 8C).
 *
 * Multi-tenant isolation depends on one invariant: every query against a
 * tenant-scoped table filters by `tenantId`. This script fails if a table is
 * touched without that predicate, so a query added later cannot silently leak
 * data across shops.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * The persistence layer is split by concern into `src/lib/data/*.server.ts`;
 * the guard scans every one of them.
 */
const dir = join(root, 'src/lib/data')
const files = readdirSync(dir)
  .filter((name) => name.endsWith('.server.ts'))
  .map((name) => join(dir, name))

const source = files
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  // eslint-disable-next-line no-useless-escape
  .replace(/(^|[^:])\/\/.*$/gm, '$1')

const TENANT_TABLES = ['products', 'orders', 'shifts', 'stockMovements', 'counters', 'carts']
const access = new RegExp(`\\.(from|delete|update)\\(\\s*(${TENANT_TABLES.join('|')})\\s*\\)`, 'g')

// A query starts after an `await`; the predicate that scopes it lives in the
// same statement, so a plain split keeps each check self-contained.
const chunks = source.split(/\bawait\b/)
const failures = []

for (const chunk of chunks) {
  const matches = [...chunk.matchAll(access)]
  if (matches.length === 0) continue
  if (/\btenantId\b/.test(chunk)) continue
  for (const match of matches) {
    const snippet = chunk.slice(match.index, match.index + 140).replace(/\s+/g, ' ').trim()
    failures.push(`${match[1]}(${match[2]}): ${snippet}`)
  }
}

if (failures.length > 0) {
  console.error('✗ Tenant-scoping guard failed. These accesses have no tenantId predicate:')
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}

console.log('✓ Tenant-scoping guard passed: every tenant table access is scoped by tenantId')
