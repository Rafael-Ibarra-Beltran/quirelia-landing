import { useEffect, useRef, useState } from 'react'
import { jelly } from '../voxel/models'
/**
 * Four steps joined by one line that draws itself with the scroll; each step lights up as the line reaches it.
 */
export function Process({ title, steps }: { title: string; steps: string[][] }) {
  const track = useRef<HTMLElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const path = useRef<SVGPathElement>(null)
  const items = useRef<(HTMLLIElement | null)[]>([])
  const art = useRef<HTMLCanvasElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const guide = useRef<HTMLDivElement>(null)
  // on phones the line runs down the left side instead of across the top
  const [vertical, setVertical] = useState(false) // same value on server and first client render; the effect below syncs it
  useEffect(() => {
    const mq = matchMedia('(max-width: 44rem)')
    const on = () => setVertical(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // The voxel jellyfish is drawn once to a canvas; three.js loads on demand.
  useEffect(() => {
    let dead = false
    const hasIdle = typeof window.requestIdleCallback === 'function'
    // wait for the browser to be idle so three.js does not compete with the first paint
    const idle = (cb: () => void) => (hasIdle ? window.requestIdleCallback(cb, { timeout: 2500 }) : window.setTimeout(cb, 600))
    const handle = idle(() => void import('../voxel/scene').then(({ renderIcon, readVoxPalette }) => {
      const cv = art.current
      if (dead || !cv) return
      try {
        renderIcon(cv, jelly(), readVoxPalette(cv), 200)
        cv.dataset.ready = 'true'
      } catch {
        /* no WebGL: the line simply has no guide */
      }
    }).catch(() => { /* chunk failed to load: the line simply has no guide */ }))
    return () => {
      dead = true
      if (hasIdle) window.cancelIdleCallback(handle)
      else clearTimeout(handle)
    }
  }, [])

  useEffect(() => {
    const el = track.current!
    const p = path.current!
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      // the block stays pinned while the track scrolls past; the line follows how far through the track we are
      const run = r.height - innerHeight
      const t = run > 0 ? Math.min(1, Math.max(0, -r.top / run)) : 1
      p.style.strokeDasharray = '1'
      p.style.strokeDashoffset = `${1 - t}`
      // the jellyfish leads the line: it sits on the tip, body first
      const g = guide.current
      const sv = svg.current
      if (g && sv) {
        const pt = p.getPointAtLength(p.getTotalLength() * t)
        const b = sv.getBoundingClientRect()
        g.style.transform = vertical
          ? `translate(${(pt.x / 120) * b.width}px, ${(pt.y / 1000) * b.height}px)`
          : `translate(${(pt.x / 1000) * b.width}px, ${(pt.y / 120) * b.height}px)`
      }
      const total = wrap.current?.offsetHeight ?? 1
      items.current.forEach((li, i) => {
        if (!li) return
        // stacked steps have uneven heights: light each one when the line reaches its top edge
        const at = vertical ? li.offsetTop / total : (i + 0.35) / steps.length
        li.classList.toggle('lit', t * 1.04 > at + (vertical ? 0.02 : 0))
      })
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [steps.length, vertical])

  return (
    <section className="section process-sec" id="proceso" aria-labelledby="proc-t" ref={track}>
      <div className="process-pin">
        <div className="container">
          <h2 id="proc-t">{title}</h2>
          <div className="process" ref={wrap}>
            <svg className="process-line" ref={svg} viewBox={vertical ? '0 0 120 1000' : '0 0 1000 120'} preserveAspectRatio="none" aria-hidden="true">
              <path ref={path} pathLength="1" d={vertical ? 'M60 0 C 8 110, 112 220, 60 340 S 8 560, 60 660 S 112 880, 60 1000' : 'M0 60 C 110 8, 220 112, 340 60 S 560 8, 660 60 S 880 112, 1000 60'} fill="none" />
            </svg>
            <div className="process-jelly" ref={guide} aria-hidden="true">
              <canvas ref={art} width="200" height="200" />
            </div>
            <ol className="steps">
              {steps.map(([h, p], i) => (
                <li key={h} ref={(n) => { items.current[i] = n }}>
                  <h3>{h}</h3>
                  <p>{p}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
