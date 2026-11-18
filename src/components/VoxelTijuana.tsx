import { useEffect, useRef } from 'react'
import { PCFShadowMap, Scene, Vector3, type MeshBasicMaterial } from 'three'
import { buildTijuana, frameTown, isoCamera, makeRenderer, readTownPalette, townLights } from '../voxel/scene'
import { subscribe } from '../engine/ticker'
import { useCopy } from '../lang'

interface Props {
  focus: number | null // which place to zoom into; null shows the whole town
}

const FOCUS_ZOOM = 3.3
const MAX_ZOOM = 6
const PAN_LIMIT = 62
const BASE = new Vector3(40, 34, 40)
const BASE_FACE = new Vector3(40, 25, 40) // and it comes down a little to look at the front, not the roof
const FACE_YAW = Math.PI / 4 // when a place is focused the camera swings round to face its front square on
const TMP = new Vector3()
const UP = new Vector3(0, 1, 0)
const RIGHT = new Vector3(1, 0, -1).normalize() // camera right and "up the screen" on the ground, for the iso camera
const AWAY = new Vector3(-1, 0, -1).normalize()
const ELEV = 34 / Math.hypot(40, 34, 40) // sine of the camera elevation: ground distance shows foreshortened

/** A small isometric Tijuana. Hover or focus an option and the camera glides to that place and rings it. Zoom with the buttons, Ctrl + wheel or a pinch; drag to move. Loaded on demand. */
export default function VoxelTijuana({ focus }: Props) {
  const { ui } = useCopy()
  const box = useRef<HTMLDivElement>(null)
  const focusRef = useRef(focus)
  focusRef.current = focus
  const api = useRef<{ kick: () => void; zoom: (f: number) => void; reset: () => void }>({ kick: () => {}, zoom: () => {}, reset: () => {} })

  useEffect(() => {
    const el = box.current!
    const cv = document.createElement('canvas')
    cv.className = 'diorama-canvas tj-canvas'
    cv.setAttribute('aria-hidden', 'true')
    el.appendChild(cv)
    let renderer
    try {
      renderer = makeRenderer(cv)
    } catch {
      cv.remove()
      return
    }
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = PCFShadowMap
    const pal = readTownPalette(el)
    const scene = new Scene()
    townLights(scene)
    renderer.shadowMap.autoUpdate = false // the town is still: shadows are only redrawn while it is being built
    const town = buildTijuana(pal)
    const { world, east, rings, target } = town
    scene.add(world)
    let building = true
    let dead = false
    void town.done.then(() => {
      if (dead) return
      building = false
      renderer.shadowMap.needsUpdate = true
      draw(0)
    })

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const camera = isoCamera(1, 27)
    const look = new Vector3()
    const goal = new Vector3()
    const pan = new Vector3()
    let center = new Vector3()
    let half = 27
    let userZoom = 1
    let zoom = 1
    let yaw = 0
    let visible = false
    let unsub: (() => void) | null = null
    let w = 1
    let h = 1

    const fit = () => {
      const r = el.getBoundingClientRect()
      w = Math.max(1, r.width)
      h = Math.max(1, r.height)
      renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1))
      renderer.setSize(w, h, false)
      const f = frameTown(world, w / h)
      half = f.half
      center = f.center
      const aspect = w / h
      Object.assign(camera, { left: -half * aspect, right: half * aspect, top: half, bottom: -half })
    }
    const draw = (dt: number, t = 0) => {
      const f = focusRef.current
      if (f === null) goal.copy(center).add(pan)
      else goal.copy(target(f))
      const gz = f === null ? userZoom : Math.max(userZoom, FOCUS_ZOOM)
      const k = reduce ? 1 : Math.min(1, dt * 5)
      look.lerp(goal, k)
      zoom += (gz - zoom) * k
      camera.zoom = zoom
      yaw += ((f === null ? 0 : FACE_YAW) - yaw) * k
      const blend = yaw / FACE_YAW
      TMP.lerpVectors(BASE, BASE_FACE, blend).applyAxisAngle(UP, yaw)
      const sink = 1 - 0.97 * blend
      if (Math.abs(east.scale.y - sink) > 0.001) renderer.shadowMap.needsUpdate = true
      east.scale.y = sink
      east.visible = blend < 0.995
      camera.position.copy(TMP).add(look)
      camera.lookAt(look)
      camera.updateProjectionMatrix()
      if (building) renderer.shadowMap.needsUpdate = true
      if (!reduce) town.update(t, dt)
      rings.forEach((r, i) => {
        const m = r.material as MeshBasicMaterial
        m.opacity += ((f === i ? 0.95 : 0) - m.opacity) * k
        r.visible = m.opacity > 0.01
        r.scale.setScalar(f === i && !reduce ? 1 + Math.sin(t * 3) * 0.04 : 1)
      })
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
    const clampPan = () => {
      pan.y = 0
      if (pan.length() > PAN_LIMIT) pan.setLength(PAN_LIMIT)
    }
    const setZoom = (z: number) => {
      userZoom = Math.min(MAX_ZOOM, Math.max(1, z))
      if (userZoom === 1) pan.set(0, 0, 0)
      cv.style.touchAction = userZoom > 1.05 ? 'none' : 'pan-y'
      if (reduce) draw(1)
    }
    api.current = { kick: () => reduce && draw(1), zoom: (f) => setZoom(userZoom * f), reset: () => setZoom(1) }

    fit()
    draw(1)
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

    // Ctrl + wheel (also a trackpad pinch) zooms; a plain wheel keeps scrolling the page
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      setZoom(userZoom * Math.exp(-e.deltaY * 0.01))
    }
    // one pointer drags the map, two pointers pinch it
    const ptrs = new Map<number, { x: number; y: number }>()
    let pinch = 0
    const dist = () => {
      const [a, b] = [...ptrs.values()]
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    const down = (e: PointerEvent) => {
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
      cv.setPointerCapture(e.pointerId)
      if (ptrs.size === 2) pinch = dist()
    }
    const move = (e: PointerEvent) => {
      const p = ptrs.get(e.pointerId)
      if (!p) return
      const dx = e.clientX - p.x
      const dy = e.clientY - p.y
      p.x = e.clientX
      p.y = e.clientY
      if (ptrs.size === 2) {
        const d = dist()
        if (pinch) setZoom(userZoom * (d / pinch))
        pinch = d
        return
      }
      if (focusRef.current !== null) return
      const s = (2 * half) / zoom / h
      pan.addScaledVector(RIGHT, -dx * s).addScaledVector(AWAY, (dy * s) / ELEV)
      clampPan()
      if (reduce) draw(1)
    }
    const up = (e: PointerEvent) => {
      ptrs.delete(e.pointerId)
      pinch = 0
    }
    cv.style.touchAction = 'pan-y'
    cv.addEventListener('wheel', wheel, { passive: false })
    cv.addEventListener('pointerdown', down)
    cv.addEventListener('pointermove', move)
    cv.addEventListener('pointerup', up)
    cv.addEventListener('pointercancel', up)
    return () => {
      dead = true
      stop()
      ro.disconnect()
      io.disconnect()
      cv.removeEventListener('wheel', wheel)
      cv.removeEventListener('pointerdown', down)
      cv.removeEventListener('pointermove', move)
      cv.removeEventListener('pointerup', up)
      cv.removeEventListener('pointercancel', up)
      renderer.dispose()
      cv.remove()
    }
  }, [])

  useEffect(() => {
    api.current.kick()
  }, [focus])

  return (
    <>
      <div ref={box} className="diorama" />
      <div className="map-zoom" role="group" aria-label={ui.mapControls}>
        <button type="button" aria-label={ui.mapZoomIn} title={ui.mapZoomIn} onClick={() => api.current.zoom(1.4)}>+</button>
        <button type="button" aria-label={ui.mapZoomOut} title={ui.mapZoomOut} onClick={() => api.current.zoom(1 / 1.4)}>−</button>
        <button type="button" aria-label={ui.mapReset} title={ui.mapReset} onClick={() => api.current.reset()}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </div>
    </>
  )
}
