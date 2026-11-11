import { forwardRef, useEffect, useImperativeHandle, useRef, type ReactNode } from 'react'
import { Field, type Mode, type Wave } from '../engine/field'
import { subscribe } from '../engine/ticker'
import { useCopy } from '../lang'
import { heroLayout } from '../engine/layouts'

export type ModeName = 'negocio' | 'tecnico'
export interface StageHandle {
  transition(next: ModeName, origin: { x: number; y: number }, commit: () => void): Promise<void>
}

const FADE_MS = 260
const SWEEP_MS = 1500
const BAND = 280
const ease = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
/** Glides to the top (quicker for short distances), resolving once there. Per-frame jumps are instant so the page's own smooth-scroll does not fight them. */
function scrollToTop() {
  const y0 = window.scrollY
  if (y0 < 1) return Promise.resolve()
  const dur = Math.min(900, 350 + y0 * 0.25)
  const t0 = performance.now()
  return new Promise<void>((done) => {
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur)
      window.scrollTo({ top: y0 * (1 - ease(p)), behavior: 'instant' })
      if (p < 1) requestAnimationFrame(step)
      else done()
    }
    requestAnimationFrame(step)
  })
}
const hash = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return s - Math.floor(s)
}

interface Props {
  mode: ModeName
  nav: ReactNode
  children: ReactNode
}

interface Trans {
  start: number
  toAscii: boolean
  maxWave: number
  maxDisc: number
  ox: number
  oy: number
  vx: number
  vy: number
  commit: () => void
  done: () => void
  pushed: boolean
  gen: number
}

/** Hero stage: the deep-water canvas, the dive transition, the nav and the hero copy. */
export const Stage = forwardRef<StageHandle, Props>(function Stage({ mode, nav, children }, ref) {
  const { ui } = useCopy()
  const box = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const fx = useRef<HTMLCanvasElement>(null)
  const disc = useRef<HTMLDivElement>(null)
  const fillEl = useRef<HTMLDivElement>(null)
  const field = useRef<Field | null>(null)
  const modeRef = useRef<Mode>(mode === 'tecnico' ? 'ascii' : 'pixel')
  const trans = useRef<Trans | null>(null)
  const fxInk = useRef({ a: '', b: '', c: '', font: 'monospace' })
  const kick = useRef<() => void>(() => {})
  const readyP = useRef<Promise<void>>(Promise.resolve())
  const running = useRef<Promise<void> | null>(null) // one transition at a time, until its disc has faded too
  const gen = useRef(0)

  useImperativeHandle(ref, () => ({
    transition(next, fallback, commit) {
      if (running.current) return running.current
      const mine = ++gen.current
      const p = new Promise<void>((resolveRaw) => {
        const resolve = () => {
          running.current = null
          resolveRaw()
        }
        const f = field.current
        const el = box.current
        const root = document.documentElement
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
        if (!f || !el || reduce) {
          // no sweep: the content fades out, the mode changes while it is hidden, and it fades back in
          window.scrollTo({ top: 0, behavior: 'instant' })
          root.dataset.switching = 'out'
          setTimeout(() => {
            modeRef.current = next === 'tecnico' ? 'ascii' : 'pixel'
            commit()
            delete root.dataset.switching
            void f?.readTokens().then(() => f.draw(modeRef.current))
            resolve()
          }, 240)
          return
        }
        const begin = () => {
          const rect = el.getBoundingClientRect()
          // the sweep is born at the centre of the headline that is on screen
          let origin = fallback
          const h1 = document.getElementById(next === 'tecnico' ? 'h1-negocio' : 'h1-tecnico')
          if (h1) {
            const r = document.createRange()
            r.selectNodeContents(h1)
            const b = r.getBoundingClientRect()
            if (b.width > 0) origin = { x: b.left + b.width / 2, y: b.top + b.height / 2 }
          }
          const farthest = (cx: number, cy: number, x0: number, y0: number, x1: number, y1: number) => Math.max(Math.hypot(cx - x0, cy - y0), Math.hypot(cx - x1, cy - y0), Math.hypot(cx - x0, cy - y1), Math.hypot(cx - x1, cy - y1))
          const vw = root.clientWidth
          const maxDisc = farthest(origin.x, origin.y, 0, 0, vw, innerHeight) + BAND
          const maxWave = maxDisc // one radius for the colour front and the disc, so the strip under the hero turns with the floor
          const d = disc.current!
          d.style.transition = 'none'
          d.style.opacity = '1'
          d.style.left = `${origin.x}px`
          d.style.top = `${origin.y}px`
          d.style.width = d.style.height = `${maxDisc * 2}px`
          d.style.marginLeft = d.style.marginTop = `${-maxDisc}px`
          d.dataset.to = next
          // the fill is the new page colour: the new water over the hero, the new paper (= the floor's fill) under it
          const [w1, w2, paper] = next === 'tecnico' ? ['--water-ta', '--water-tb', '--surface-fill-tech'] : ['--water-a', '--water-b', '--surface-fill-simple']
          const f = fillEl.current!
          f.style.opacity = '1'
          f.style.transition = 'none'
          f.style.clipPath = 'circle(0px)'
          f.style.background = `linear-gradient(to bottom, var(${w1}) ${rect.top}px, var(${w2}) ${rect.bottom}px, var(${paper}) ${rect.bottom}px)`
          const cs = getComputedStyle(el)
          fxInk.current = { a: cs.getPropertyValue('--ascii-base').trim(), b: cs.getPropertyValue('--ascii-bright').trim(), c: cs.getPropertyValue('--jelly-deep-5').trim(), font: cs.getPropertyValue('--font-outlier').trim() || 'monospace' }
          const c = fx.current!
          c.width = vw
          c.height = innerHeight
          root.dataset.switching = 'out'
          trans.current = { start: performance.now() + FADE_MS, toAscii: next === 'tecnico', maxWave, maxDisc, ox: origin.x - rect.left, oy: origin.y - rect.top, vx: origin.x, vy: origin.y, commit, done: resolve, pushed: false, gen: mine }
          kick.current() // the hero may be off screen (the floating button): the sweep still has to run
          // if something stops the sweep, finish it anyway
          setTimeout(() => {
            if (trans.current) trans.current.start = -SWEEP_MS * 2
            kick.current()
          }, FADE_MS + SWEEP_MS + 800)
        }
        // always from the top, at once (not smoothly), then measure; wait for the canvas tokens if the page is still loading
        void Promise.all([readyP.current, scrollToTop()]).then(() => requestAnimationFrame(begin))
      })
      running.current = p
      return p
    },
  }))

  useEffect(() => {
    const cv = canvas.current!
    const el = box.current!
    const f = new Field(cv, [], { scheme: 'deep', rays: true, snow: 80, surface: true })
    field.current = f
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let ready = false
    let visible = true
    let size = { w: 0, h: 0 }
    let unsub: (() => void) | null = null

    // glyph rain (plain to technical) or rising bubbles (technical to plain) that trail the wave front
    const drawFx = (tr: Trans, e: number, p: number) => {
      const c = fx.current!
      const ctx = c.getContext('2d')!
      ctx.clearRect(0, 0, c.width, c.height)
      const R = e * tr.maxDisc
      const colW = 18
      const now = performance.now() / 1000
      const fade = 1 - Math.pow(p, 3)
      const ink = fxInk.current
      if (tr.toAscii) ctx.font = `15px ${ink.font}`
      for (let col = 0; col < c.width / colW; col++) {
        const x = col * colW
        const h0 = hash(col, 1)
        if (h0 > 0.55) continue
        const speed = 220 + h0 * 420
        const head = ((now * speed + h0 * 2000) % (c.height + 400)) - 200
        for (let k = 0; k < 12; k++) {
          const y = tr.toAscii ? head - k * 17 : c.height - (head - k * 17)
          if (y < -20 || y > c.height + 20) continue
          const dist = Math.hypot(x - tr.vx, y - tr.vy)
          const behind = R - dist
          if (behind < 0 || behind > BAND) continue
          const a = (1 - behind / BAND) * (1 - k / 12) * fade
          ctx.globalAlpha = Math.max(0, a)
          if (tr.toAscii) {
            ctx.fillStyle = k === 0 ? ink.b : ink.a
            ctx.fillText('{}[]<>/=;:+*#01|'[Math.floor(hash(col, k + Math.floor(now * 8)) * 16)], x, y)
          } else {
            ctx.fillStyle = ink.c
            const s = 6 + Math.floor(h0 * 10)
            ctx.fillRect(x, y, s, s)
          }
        }
      }
      ctx.globalAlpha = 1
    }

    const render = (t: number, dt: number) => {
      if (!ready) return
      f.update(t, dt)
      let wave: Wave | undefined
      const tr = trans.current
      const now = performance.now()
      if (tr && now >= tr.start) {
        const p = Math.min(1, (now - tr.start) / SWEEP_MS)
        const e = ease(p)
        wave = { x: tr.ox, y: tr.oy, radius: e * tr.maxWave, band: BAND, toAscii: tr.toAscii }
        const rad = Math.max(0, e * tr.maxDisc - BAND / 2)
        disc.current!.style.transform = `scale(${rad / tr.maxDisc})`
        fillEl.current!.style.clipPath = `circle(${rad}px at ${tr.vx}px ${tr.vy}px)`
        drawFx(tr, e, p)
        if (p >= 1) {
          modeRef.current = tr.toAscii ? 'ascii' : 'pixel'
          trans.current = null
          wave = undefined
          tr.commit()
          // the disc fades away while the page comes back, instead of vanishing
          // (one frame later, so everything underneath has already painted in its final colours)
          const d = disc.current!
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              d.style.transition = 'opacity 300ms ease-out'
              d.style.opacity = '0'
              const f = fillEl.current!
              f.style.transition = 'opacity 300ms ease-out'
              f.style.opacity = '0'
              setTimeout(() => {
                tr.done()
                if (gen.current !== tr.gen) return // a newer transition owns the disc now
                f.style.transition = 'none'
                f.style.clipPath = 'circle(0px)'
                f.style.opacity = '1'
                d.style.transition = 'none'
                d.style.transform = 'scale(0)'
                d.style.opacity = '1'
              }, 340)
            }),
          )
          fx.current!.getContext('2d')!.clearRect(0, 0, fx.current!.width, fx.current!.height)
          const h = document.documentElement
          delete h.dataset.switching
          h.dataset.entering = ''
          setTimeout(() => delete h.dataset.entering, 1200)
          void f.readTokens()
        }
      }
      f.draw(modeRef.current, wave)
      if (reduce && !trans.current) stop()
    }
    const start = () => {
      if (!unsub && visible && ready && !document.hidden) unsub = subscribe(render)
    }
    kick.current = () => {
      visible = true
      start()
    }
    const stop = () => {
      unsub?.()
      unsub = null
    }

    const fit = () => {
      const r = el.getBoundingClientRect()
      size = { w: r.width, h: r.height }
      f.resize(r.width, r.height, window.devicePixelRatio || 1)
      f.setJellies(heroLayout(r.width, r.height))
      if (ready) {
        f.update(2, 0)
        stop()
        start()
      }
    }
    fit()
    readyP.current = f.readTokens().then(() => {
      ready = true
      f.update(2, 0)
      start()
    })

    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      if (Math.abs(r.width - size.w) > 1 || Math.abs(r.height - size.h) > 1) fit()
    })
    ro.observe(el)
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) start()
      else if (!trans.current) stop() // never stop in the middle of a sweep
    })
    io.observe(el)
    const scroll = () => f.setScroll(window.scrollY)
    window.addEventListener('scroll', scroll, { passive: true })
    return () => {
      stop()
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('scroll', scroll)
    }
  }, [])

  // A mode change that did not come from a transition (first load with ?modo=tecnico).
  useEffect(() => {
    if (!trans.current) modeRef.current = mode === 'tecnico' ? 'ascii' : 'pixel'
  }, [mode])

  return (
    <section className="stage deep" ref={box} aria-label={ui.stageLabel}>
      <canvas ref={canvas} className="stage-canvas" aria-hidden="true" />
      <div className="fade nav-wrap">{nav}</div>
      <div className="container stage-copy fade">{children}</div>
      <div ref={fillEl} className="disc-fill" aria-hidden="true" />
      <div ref={disc} className="disc" aria-hidden="true" />
      <canvas ref={fx} className="fx" aria-hidden="true" />
    </section>
  )
})
