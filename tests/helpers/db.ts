import { mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Test database harness.
 *
 * Points the app at a throwaway file-backed libSQL database, applies every
 * migration in `drizzle/`, and exposes `resetDatabase` to wipe all rows
 * between tests. Import this module FIRST in every test file, before
 * anything that touches `getDb`, so the env vars are set before the client
 * is memoised.
 */
const here = dirname(fileURLToPath(import.meta.url))
const dir = mkdtempSync(join(tmpdir(), 'warung-pos-test-'))
process.env.TURSO_URL = `file:${join(dir, 'test.db')}`
process.env.TURSO_ACCESS_TOKEN = 'test-token'

const { getDb } = await import('../../src/db/client.server')

interface RawClient {
  execute: (sql: string) => Promise<unknown>
}

const db = getDb()
// drizzle's libSQL wrapper exposes the underlying @libsql/client as $client.
const raw = (db as unknown as { $client: RawClient }).$client

const migrationDirs = readdirSync(join(here, '../../drizzle'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^\d+_/.test(entry.name))
  .map((entry) => entry.name)
  .sort()

for (const dirName of migrationDirs) {
  const sql = readFileSync(join(here, '../../drizzle', dirName, 'migration.sql'), 'utf8')
  for (const statement of sql.split('--> statement-breakpoint')) {
    const trimmed = statement.trim()
    if (trimmed !== '') {
      await raw.execute(trimmed)
    }
  }
}

/** Removes every row from every table, preserving the schema. */
export async function resetDatabase(): Promise<void> {
  const tables = [
    'cart_items',
    'carts',
    'order_items',
    'orders',
    'stock_movements',
    'shifts',
    'products',
    'counters',
    'memberships',
    'tenants',
    'users',
  ]
  for (const table of tables) {
    await raw.execute(`DELETE FROM ${table}`)
  }
}
