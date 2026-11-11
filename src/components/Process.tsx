import { useEffect, useRef } from 'react'
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

  // The voxel jellyfish is drawn once to a canvas; three.js loads on demand.
  useEffect(() => {
    let dead = false
    void import('../voxel/scene').then(({ renderIcon, readVoxPalette }) => {
      const cv = art.current
      if (dead || !cv) return
      try {
        renderIcon(cv, jelly(), readVoxPalette(cv), 200)
        cv.dataset.ready = 'true'
      } catch {
        /* no WebGL: the line simply has no guide */
      }
    })
    return () => {
      dead = true
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
        g.style.transform = `translate(${(pt.x / 1000) * b.width}px, ${(pt.y / 120) * b.height}px)`
      }
      items.current.forEach((li, i) => li?.classList.toggle('lit', t * 1.04 > (i + 0.35) / steps.length))
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
  }, [steps.length])

  return (
    <section className="section process-sec" id="proceso" aria-labelledby="proc-t" ref={track}>
      <div className="process-pin">
        <div className="container">
          <h2 id="proc-t">{title}</h2>
          <div className="process" ref={wrap}>
            <svg className="process-line" ref={svg} viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
              <path ref={path} pathLength="1" d="M0 60 C 110 8, 220 112, 340 60 S 560 8, 660 60 S 880 112, 1000 60" fill="none" />
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
