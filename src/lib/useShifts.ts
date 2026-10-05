import { useSyncExternalStore } from 'react'
import { getShiftsSnapshot, subscribeToShifts } from './shifts'
import type { Shift } from '../types'

export {
  closeShift,
  currentShift,
  expectedCashFor,
  listShifts,
  openShift,
} from './shifts'

/** Shifts stored on this device, newest first. Re-renders on any change. */
export function useShifts(): Shift[] {
  return useSyncExternalStore(subscribeToShifts, getShiftsSnapshot, getShiftsSnapshot)
}
