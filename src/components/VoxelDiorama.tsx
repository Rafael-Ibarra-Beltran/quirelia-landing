import { useEffect, useRef } from 'react'
import { Raycaster, Scene, Vector2 } from 'three'
import { buildDiorama, isoCamera, lights, makeRenderer, readVoxPalette } from '../voxel/scene'
import { subscribe } from '../engine/ticker'
import { animateStack } from '../voxel/anim'

interface Props {
  active: number | null // a row of text is hovered or focused: lift its structure
  onHover: (i: number | null) => void // the pointer is over a structure
}

/** Isometric voxel island, one structure per stack group. Drag to turn it. Loaded on demand. */
export default function VoxelDiorama({ active, onHover }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const activeRef = useRef(active)
  activeRef.current = active
  const hoverRef = useRef(onHover)
  hoverRef.current = onHover

  useEffect(() => {
    const el = box.current!
    const cv = document.createElement('canvas')
    cv.className = 'diorama-canvas'
    cv.setAttribute('aria-hidden', 'true')
    el.appendChild(cv)
    let renderer
    try {
      renderer = makeRenderer(cv)
    } catch {
      cv.remove()
      return
    }
    const pal = readVoxPalette(el)
    const scene = new Scene()
    lights(scene)
    const { world, meshes } = buildDiorama(pal)
    scene.add(world)

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let camera = isoCamera(1, 30)
    let visible = false
    let unsub: (() => void) | null = null
    let drag: { x: number; rot: number } | null = null
    let vel = 0
    let hovered: number | null = null
    const ray = new Raycaster()
    const ndc = new Vector2()

    const fit = () => {
      const r = el.getBoundingClientRect()
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
      renderer.setSize(r.width, r.height, false)
      camera = isoCamera(r.width / r.height, 27)
    }
    const draw = (dt: number, t = 0) => {
      if (!reduce) meshes.forEach((m, i) => animateStack(i, m, pal, t))
      if (!drag) {
        world.rotation.y += (reduce ? 0 : 0.12 + vel) * dt
        vel *= Math.pow(0.04, dt)
      }
      const lift = activeRef.current ?? hovered
      meshes.forEach((m, i) => (m.position.y += ((lift === i ? 2.5 : 0) - m.position.y) * Math.min(1, dt * 8)))
      renderer.render(scene, camera)
    }
    const tick = (t: number, dt: number) => draw(dt, t)
    const start = () => {
      if (!unsub && visible && !reduce && !document.hidden) unsub = subscribe(tick)
    }
    const stop = () => {
      unsub?.()
      unsub = null
    }

    fit()
    draw(0)
    const ro = new ResizeObserver(() => {
      fit()
      draw(0)
    })
    ro.observe(el)
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) start()
      else stop()
    })
    io.observe(el)

    const down = (e: PointerEvent) => {
      drag = { x: e.clientX, rot: world.rotation.y }
      cv.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect()
      if (drag) {
        const next = drag.rot + (e.clientX - drag.x) * 0.01
        vel = (next - world.rotation.y) * 3
        world.rotation.y = next
        if (reduce) draw(0)
        return
      }
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      const hit = ray.intersectObjects(meshes)[0]
      const i = hit ? (hit.object.userData.i as number) : null
      if (i !== hovered) {
        hovered = i
        hoverRef.current(i)
        if (reduce) draw(0)
      }
    }
    const up = () => {
      drag = null
    }
    const leave = () => {
      hovered = null
      hoverRef.current(null)
    }
    cv.addEventListener('pointerdown', down)
    cv.addEventListener('pointermove', move)
    cv.addEventListener('pointerup', up)
    cv.addEventListener('pointerleave', leave)

    return () => {
      stop()
      ro.disconnect()
      io.disconnect()
      cv.removeEventListener('pointerdown', down)
      cv.removeEventListener('pointermove', move)
      cv.removeEventListener('pointerup', up)
      cv.removeEventListener('pointerleave', leave)
      renderer.dispose()
      cv.remove()
    }
  }, [])

  return <div ref={box} className="diorama" />
}
