import { describe, expect, it } from 'vitest'
import { BETA_POINTS, FAQ, FACTS, FEATURES, HERO, STEPS } from '../src/data/marketing'

describe('data homepage', () => {
  it('memuat enam fitur dengan judul unik', () => {
    expect(FEATURES).toHaveLength(6)
    expect(new Set(FEATURES.map((feature) => feature.title)).size).toBe(FEATURES.length)
    for (const feature of FEATURES) {
      expect(feature.title.trim()).not.toBe('')
      expect(feature.body.trim()).not.toBe('')
    }
  })

  it('memuat empat langkah pemakaian', () => {
    expect(STEPS).toHaveLength(4)
    expect(new Set(STEPS.map((step) => step.title)).size).toBe(STEPS.length)
  })

  it('memuat fakta tanpa angka pemakaian karangan', () => {
    expect(FACTS).toHaveLength(4)
    expect(FACTS.map((fact) => fact.value)).toEqual(['Rp0', '3', '3', '7 hari'])
  })

  it('setiap FAQ punya pertanyaan unik dan jawaban terisi', () => {
    expect(FAQ.length).toBeGreaterThanOrEqual(8)
    expect(new Set(FAQ.map((item) => item.question)).size).toBe(FAQ.length)
    for (const item of FAQ) {
      expect(item.question.trim()).not.toBe('')
      expect(item.answer.trim().length).toBeGreaterThan(20)
    }
  })

  it('menyebut masa uji coba secara eksplisit di hero dan poin gratis', () => {
    expect(HERO.badge.toLowerCase()).toContain('uji coba')
    expect(BETA_POINTS.length).toBeGreaterThanOrEqual(3)
    expect(BETA_POINTS.join(' ').toLowerCase()).toContain('kartu kredit')
  })
})
