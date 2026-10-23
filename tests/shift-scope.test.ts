import { beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase } from './helpers/db'

const { getDb } = await import('../src/db/client.server')
const { shifts, tenants } = await import('../src/db/schema')
const data = await import('../src/lib/data.server')

const TENANT = 'tenant-shift-test'
const OTHER_TENANT = 'tenant-shift-other'
const FROM = '2026-01-01T00:00:00.000Z'

beforeEach(async () => {
  await resetDatabase()
  const now = new Date().toISOString()
  await getDb().insert(tenants).values([
    { id: TENANT, name: 'Warung Uji', createdAt: now },
    { id: OTHER_TENANT, name: 'Warung Lain', createdAt: now },
  ])
  await getDb().insert(shifts).values([
    {
      id: 'closed-yesterday',
      tenantId: TENANT,
      openedAt: '2025-12-31T01:00:00.000Z',
      closedAt: '2025-12-31T10:00:00.000Z',
      openingCash: 10000,
    },
    {
      id: 'open-yesterday',
      tenantId: TENANT,
      openedAt: '2025-12-31T01:00:00.000Z',
      openingCash: 10000,
    },
    {
      id: 'closed-today',
      tenantId: TENANT,
      openedAt: '2026-01-02T01:00:00.000Z',
      closedAt: '2026-01-02T10:00:00.000Z',
      openingCash: 10000,
    },
    {
      id: 'other-tenant-shift',
      tenantId: OTHER_TENANT,
      openedAt: '2026-01-02T01:00:00.000Z',
      openingCash: 10000,
    },
  ])
})

describe('shift history bounds', () => {
  it('filters old shifts but keeps a still-open drawer', async () => {
    const listed = await data.listShifts(TENANT, { fromIso: FROM, includeOpen: true })
    expect(listed.map((shift) => shift.id).sort()).toEqual(['closed-today', 'open-yesterday'])
  })

  it('can exclude the open drawer when only today is wanted', async () => {
    const listed = await data.listShifts(TENANT, { fromIso: FROM, includeOpen: false })
    expect(listed.map((shift) => shift.id)).toEqual(['closed-today'])
  })

  it('never returns another tenant shift by id', async () => {
    expect(await data.getShiftById(TENANT, 'other-tenant-shift')).toBeUndefined()
    expect((await data.getShiftById(TENANT, 'closed-today'))?.id).toBe('closed-today')
  })
})
