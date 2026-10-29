import { expect, it } from 'vitest'
import { BUTTON_SIZES } from '../src/components/ui/buttonStyles'

it('keeps the small shared button at least 44px tall', () => {
  expect(BUTTON_SIZES.sm).toContain('h-11')
})
