import { describe, expect, it } from 'vitest'
import { BUTTON_SIZES, buttonStyles } from '../src/components/ui/buttonStyles'

describe('button styles', () => {
  it('gives primary and secondary actions identical box metrics', () => {
    for (const size of ['sm', 'md', 'lg'] as const) {
      for (const variant of ['primary', 'secondary'] as const) {
        const classes = buttonStyles({ variant, size }).split(' ')
        for (const token of BUTTON_SIZES[size].split(' ')) {
          expect(classes).toContain(token)
        }
      }
    }
  })

  it('emits exactly one justify utility', () => {
    const classes = buttonStyles({ justify: 'between' })
    expect(classes).toContain('justify-between')
    expect(classes).not.toContain('justify-center')
  })
})
