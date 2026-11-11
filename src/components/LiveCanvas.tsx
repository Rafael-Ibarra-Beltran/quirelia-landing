import { useEffect, useRef } from 'react'
import { Field } from '../engine/field'
import { subscribe } from '../engine/ticker'
import type { JellySpec } from '../engine/species'

interface Props {
  /** Jelly layout for a canvas of this CSS size. Re-run on resize. */
  specs: (w: number, h: number) => JellySpec[]
  /** Changing this swaps the jellyfish; the new ones grow in. */
  watch?: string
  deep?: boolean // deep-water palette on a light page
  snow?: number
  rays?: boolean
  edge?: 'top' | 'bottom' // draw a water line along this edge
  interactive?: boolean
  className?: string
}

const ease = (p: number) => 1 - Math.pow(1 - p, 3)
const isTech = () => document.documentElement.dataset.mode === 'tecnico'

/**
 * A live jellyfish canvas. It follows the page mode on its own: pixel-art in the plain mode and ASCII in the
 * technical one (always on the deep palette there), and it sleeps whenever it is off screen.
 */
export function LiveCanvas({ specs, watch = '', deep = false, snow = 0, rays = false, edge, interactive = true, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const api = useRef<{ swap: () => void } | null>(null)
  const specsRef = useRef(specs)
  specsRef.current = specs

  useEffect(() => {
    const cv = ref.current!
    const el = cv.parentElement!
    const tech = isTech()
    const f = new Field(cv, [], { scheme: tech || deep ? 'deep' : 'light', snow, rays, surface: !!edge, edge })
    let ready = false
    let visible = false
    let unsub: (() => void) | null = null
    let born = performance.now()
    let base: number[] = []
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let ascii = tech
    let size = { w: 0, h: 0 }

    const place = () => {
      const r = el.getBoundingClientRect()
      size = { w: r.width, h: r.height }
      f.resize(r.width, r.height, window.devicePixelRatio || 1)
      f.setJellies(specsRef.current(r.width, r.height))
      base = f.jellies.map((j) => j.r)
      born = performance.now()
    }
    const render = (t: number, dt: number) => {
      if (!ready) return
      const k = reduce ? 1 : ease(Math.min(1, (performance.now() - born) / 520))
      f.jellies.forEach((j, i) => (j.r = base[i] * (0.55 + 0.45 * k)))
      f.update(t, dt)
      f.draw(ascii ? 'ascii' : 'pixel')
      if (reduce) stop()
    }
    const start = () => {
      if (!unsub && visible && ready && !document.hidden) unsub = subscribe(render)
    }
    const stop = () => {
      unsub?.()
      unsub = null
    }
    api.current = {
      swap: () => {
        place()
        f.update(2, 0)
        start()
      },
    }

    place()
    f.readTokens().then(() => {
      ready = true
      f.update(2, 0)
      start()
    })
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      if (Math.abs(r.width - size.w) > 1 || Math.abs(r.height - size.h) > 1) {
        place()
        if (reduce) {
          f.update(2, 0)
          render(2, 0)
        }
      }
    })
    ro.observe(el)
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) start()
      else stop()
    })
    io.observe(el)
    // follow the page mode
    const mo = new MutationObserver(() => {
      const t2 = isTech()
      ascii = t2
      void f.setScheme(t2 || deep ? 'deep' : 'light').then(() => {
        if (reduce) {
          f.update(2, 0)
          f.draw(ascii ? 'ascii' : 'pixel')
        }
      })
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] })

    const rect = () => el.getBoundingClientRect()
    const move = (e: PointerEvent) => f.setPointer(e.clientX - rect().left, e.clientY - rect().top)
    const down = (e: PointerEvent) => f.impulse(e.clientX - rect().left, e.clientY - rect().top)
    const leave = () => f.leave()
    if (interactive) {
      el.addEventListener('pointermove', move)
      el.addEventListener('pointerdown', down)
      el.addEventListener('pointerleave', leave)
    }
    return () => {
      stop()
      ro.disconnect()
      io.disconnect()
      mo.disconnect()
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointerleave', leave)
      api.current = null
    }
    // the field is created once per mount; later changes go through `watch`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    api.current?.swap()
  }, [watch])

  return <canvas ref={ref} className={className} aria-hidden="true" />
}
