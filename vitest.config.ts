import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Each test file gets its own worker process and module registry, so the
    // memoised DB client in `db/client.server.ts` is per-file.
    pool: 'forks',
  },
})
