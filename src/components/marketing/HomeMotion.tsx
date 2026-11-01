import { useEffect } from 'react'
import { loadMotion, prefersReducedMotion } from '../../lib/motion'

/**
 * Page-level motion for the homepage: scroll reveals, the hero atmosphere
 * drift, and the ledger ticker.
 *
 * This is progressive enhancement. The markup is complete and readable on the
 * server; GSAP only hides elements that are still below the fold, so nothing
 * above the fold ever waits on JavaScript.
 */
export function HomeMotion() {
  useEffect(() => {
    const root = document.getElementById('konten')
    if (!root || prefersReducedMotion()) return

    let cancelled = false
    let teardown = () => {}

    void loadMotion().then(({ gsap }) => {
      if (cancelled) return

      const observers: IntersectionObserver[] = []
      let removeVisibilityListener = () => {}
      const context = gsap.context(() => {
        /**
         * Enter from below only. An element already inside the viewport keeps
         * its rendered state — a reload mid-page must not blank the screen.
         */
        const enter = (targets: HTMLElement[], trigger: HTMLElement, stagger = 0) => {
          const pending = targets.filter(
            (target) => target.getBoundingClientRect().top >= window.innerHeight * 0.94,
          )
          if (pending.length === 0) return
          gsap.fromTo(pending, { opacity: 0, y: 18 }, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger,
            ease: 'power3.out',
            scrollTrigger: { trigger, start: 'top 92%', once: true },
          })
        }

        for (const element of gsap.utils.toArray<HTMLElement>('[data-reveal]', root)) {
          if (!element.closest('[data-reveal-group]')) enter([element], element)
        }

        for (const group of gsap.utils.toArray<HTMLElement>('[data-reveal-group]', root)) {
          enter(Array.from(group.children) as HTMLElement[], group, 0.08)
        }

        const hero = root.querySelector<HTMLElement>('[data-hero]')
        if (hero) {
          const scrollTrigger = {
            trigger: hero,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.6,
          } as const
          const blobs = gsap.utils.toArray<HTMLElement>('[data-hero-blob]', hero)
          if (blobs.length > 0) gsap.to(blobs, { yPercent: 12, ease: 'none', scrollTrigger })
          const chips = gsap.utils.toArray<HTMLElement>('[data-hero-chip]', hero)
          if (chips.length > 0) gsap.to(chips, { y: -24, ease: 'none', scrollTrigger })
        }

        const marquee = root.querySelector<HTMLElement>('[data-marquee]')
        const track = marquee?.querySelector<HTMLElement>('[data-marquee-track]')
        if (marquee && track) {
          const loop = gsap.to(track, {
            xPercent: -50,
            duration: 24,
            ease: 'none',
            repeat: -1,
          })
          let inView = false
          const syncPlayback = () => {
            if (inView && !document.hidden) loop.play()
            else loop.pause()
          }
          const observer = new IntersectionObserver(([entry]) => {
            inView = !!entry?.isIntersecting
            syncPlayback()
          })
          loop.pause()
          observer.observe(marquee)
          observers.push(observer)
          document.addEventListener('visibilitychange', syncPlayback)
          removeVisibilityListener = () => document.removeEventListener('visibilitychange', syncPlayback)
        }
      }, root)

      teardown = () => {
        removeVisibilityListener()
        for (const observer of observers) observer.disconnect()
        context.revert()
      }
    })

    return () => {
      cancelled = true
      teardown()
    }
  }, [])

  return null
}
