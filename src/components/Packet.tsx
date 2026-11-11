import { useEffect, useRef } from 'react'
import { subscribe } from '../engine/ticker'

const R = 16 // corner radius of the pipeline box
const SIZE = 12
const SECONDS = 10 // one lap

/** Where a point sits along the rounded rectangle's border, u from 0 to 1 starting at the top-left corner. */
function onBorder(u: number, w: number, h: number): [number, number] {
  const a = Math.max(0, w - 2 * R)
  const b = Math.max(0, h - 2 * R)
  const arc = (Math.PI * R) / 2
  let d = u * (2 * a + 2 * b + 4 * arc)
  if (d < a) return [R + d, 0]
  d -= a
  if (d < arc) return [w - R + R * Math.sin(d / R), R - R * Math.cos(d / R)]
  d -= arc
  if (d < b) return [w, R + d]
  d -= b
  if (d < arc) return [w - R + R * Math.cos(d / R), h - R + R * Math.sin(d / R)]
  d -= arc
  if (d < a) return [w - R - d, h]
  d -= a
  if (d < arc) return [R - R * Math.sin(d / R), h - R + R * Math.cos(d / R)]
  d -= arc
  if (d < b) return [0, h - R - d]
  d -= b
  return [R - R * Math.cos(d / R), R - R * Math.sin(d / R)]
}

/** A small square that travels all the way around the pipeline box. Hidden with reduced motion. */
export function Packet() {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current!
    const box = el.parentElement!
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.hidden = true
      return
    }
    let w = 0
    let h = 0
    let visible = false
    let unsub: (() => void) | null = null
    const tick = (t: number) => {
      const [x, y] = onBorder((t / SECONDS) % 1, w, h)
      el.style.transform = `translate(${x - SIZE / 2}px, ${y - SIZE / 2}px)`
    }
    const sync = () => {
      if (visible && w > 0 && !unsub) unsub = subscribe(tick)
      if (!visible && unsub) {
        unsub()
        unsub = null
      }
    }
    const ro = new ResizeObserver(() => {
      const r = box.getBoundingClientRect()
      w = r.width
      h = r.height
      sync()
    })
    ro.observe(box)
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      sync()
    })
    io.observe(box)
    return () => {
      ro.disconnect()
      io.disconnect()
      unsub?.()
    }
  }, [])

  return <span ref={ref} className="packet" aria-hidden="true" />
}
