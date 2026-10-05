import { createServerOnlyFn } from '@tanstack/react-start'
import { drizzle } from 'drizzle-orm/libsql'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import type { EmptyRelations } from 'drizzle-orm/relations'
import { createClient } from '@libsql/client'
import { databaseEnv } from '../lib/env.server'

/**
 * Database client.
 *
 * `createServerOnlyFn` guarantees this module can never be pulled into a client
 * bundle. The connection is created lazily and memoised per server process so
 * hot module reload does not open a new client on every edit.
 *
 * The relational query builder (`db.query.*`) is intentionally not enabled: all
 * reads use the explicit select builder, so no relations declarations are needed.
 */

export type AppDatabase = LibSQLDatabase<EmptyRelations>

let client: AppDatabase | undefined

export const getDb = createServerOnlyFn((): AppDatabase => {
  if (client) return client
  const env = databaseEnv()
  client = drizzle({ client: createClient({ url: env.url, authToken: env.authToken }) })
  return client
})
