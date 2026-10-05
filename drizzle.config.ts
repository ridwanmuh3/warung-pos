import { defineConfig } from 'drizzle-kit'

/**
 * drizzle-kit configuration for the Turso (libSQL) database.
 *
 * Credentials come from the environment; run kit with the env file loaded:
 *   node --env-file=.env node_modules/.bin/drizzle-kit push
 */
export default defineConfig({
  dialect: 'turso',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_ACCESS_TOKEN,
  },
})
