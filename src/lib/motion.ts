/**
 * Motion runtime for the marketing homepage.
 *
 * GSAP is loaded on demand: the page renders its content and CSS entrance
 * without it, and only the scroll-driven sections need the timeline. Keeping
 * the import dynamic also keeps the browser-only ScrollTrigger plugin out of
 * the SSR bundle.
 */
export interface Motion {
  gsap: typeof import('gsap').gsap
  ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger
}

let pending: Promise<Motion> | null = null

export function loadMotion(): Promise<Motion> {
  pending ??= Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
    ([{ gsap }, { ScrollTrigger }]) => {
      gsap.registerPlugin(ScrollTrigger)
      // Mobile browsers collapse their address bar while scrolling; refreshing
      // on that resize would make the sticky ledger jump.
      ScrollTrigger.config({ ignoreMobileResize: true })
      return { gsap, ScrollTrigger }
    },
  )
  return pending
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Maps scroll progress in `[0, 1]` to the step currently being told. Kept pure
 * so the boundary behaviour is covered without a browser.
 */
export function stepFromProgress(progress: number, count: number): number {
  if (count <= 1) return 0
  const safe = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0
  return Math.min(count - 1, Math.floor(safe * count))
}
