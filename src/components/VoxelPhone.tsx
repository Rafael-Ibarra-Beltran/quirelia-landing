import { useEffect, useRef } from 'react'
import { CanvasTexture, Group, LinearFilter, Mesh, MeshBasicMaterial, PlaneGeometry, Scene, SRGBColorSpace } from 'three'
import { phoneChat } from '../voxel/models'
import { frontCamera, lights, makeRenderer, modelMesh, readVoxPalette } from '../voxel/scene'
import { subscribe } from '../engine/ticker'

export interface ChatCopy {
  title: string
  user: string
  bot: string
  source: string
  note: string
}

const W = 320
const H = 560
const LOOP = 11 // seconds

/** A voxel phone that sways while a scripted chat plays on its screen. The words live on a canvas texture. */
export default function VoxelPhone({ chat }: { chat: ChatCopy }) {
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = box.current!
    const cv = document.createElement('canvas')
    cv.className = 'phone-canvas'
    cv.setAttribute('aria-hidden', 'true')
    el.appendChild(cv)
    let renderer
    try {
      renderer = makeRenderer(cv)
    } catch {
      cv.remove()
      return
    }
    const cs = getComputedStyle(el)
    const token = (n: string) => cs.getPropertyValue(n).trim()
    const body = token('--font-body') || 'sans-serif'
    const mono = token('--font-outlier') || 'monospace'
    const ink = { bg: token('--deep-paper'), bar: token('--deep-paper-3'), bot: token('--deep-paper-2'), user: token('--deep-button'), text: token('--deep-ink'), muted: token('--deep-muted'), accent: token('--deep-accent') }

    const pal = readVoxPalette(el)
    const scene = new Scene()
    lights(scene)
    const phone = new Group()
    const body3d = modelMesh(phoneChat(), pal, 1)
    body3d.position.y = -9
    phone.add(body3d)
    const tex = document.createElement('canvas')
    tex.width = W
    tex.height = H
    const t2d = tex.getContext('2d')!
    const map = new CanvasTexture(tex)
    map.colorSpace = SRGBColorSpace
    map.minFilter = LinearFilter
    const screen = new Mesh(new PlaneGeometry(8, 14), new MeshBasicMaterial({ map }))
    screen.position.set(0, 0, 1.53)
    phone.add(screen)
    scene.add(phone)

    const wrap = (text: string, max: number) => {
      const out: string[] = []
      let line = ''
      for (const w of text.split(' ')) {
        if (t2d.measureText(line + w).width > max && line) {
          out.push(line.trim())
          line = ''
        }
        line += w + ' '
      }
      out.push(line.trim())
      return out
    }
    const bubble = (text: string, x: number, y: number, fill: string, right: boolean) => {
      t2d.font = `500 27px ${body}`
      const lines = wrap(text, 218)
      const w = Math.max(...lines.map((l) => t2d.measureText(l).width)) + 28
      const h = lines.length * 36 + 22
      const bx = right ? x - w : x
      t2d.fillStyle = fill
      t2d.beginPath()
      t2d.roundRect(bx, y, w, h, 16)
      t2d.fill()
      t2d.fillStyle = ink.text
      lines.forEach((l, i) => t2d.fillText(l, bx + 14, y + 36 + i * 36))
      return h
    }
    let shown = ''
    const paintChat = (time: number) => {
      const u = time > 0.6
      const typing = time > 1.8 && time < 3.2
      const b = time >= 3.2
      const s = time > 4.6
      const key = `${u}${typing ? Math.floor(time * 4) % 4 : ''}${b}${s}`
      if (key === shown) return
      shown = key
      t2d.clearRect(0, 0, W, H)
      t2d.fillStyle = ink.bg
      t2d.fillRect(0, 0, W, H)
      t2d.fillStyle = ink.bar
      t2d.fillRect(0, 0, W, 70)
      t2d.fillStyle = ink.text
      t2d.font = `600 25px ${body}`
      t2d.fillText(chat.title, 20, 44)
      let y = 100
      if (u) y += bubble(chat.user, W - 20, y, ink.user, true) + 14
      if (typing) {
        t2d.fillStyle = ink.bot
        t2d.beginPath()
        t2d.roundRect(20, y, 84, 40, 16)
        t2d.fill()
        for (let d = 0; d < 3; d++) {
          t2d.fillStyle = d === Math.floor(time * 4) % 3 ? ink.text : ink.muted
          t2d.fillRect(40 + d * 16, y + 17, 7, 7)
        }
      }
      if (b) y += bubble(chat.bot, 20, y, ink.bot, false) + 8
      if (s) {
        t2d.fillStyle = ink.accent
        t2d.font = `400 18px ${mono}`
        t2d.fillText(chat.source, 22, y + 20)
      }
      t2d.fillStyle = ink.muted
      t2d.font = `400 16px ${body}`
      t2d.fillText(chat.note, 20, H - 18)
      map.needsUpdate = true
    }

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let camera = frontCamera(1, 11)
    let visible = false
    let unsub: (() => void) | null = null
    const fit = () => {
      const r = el.getBoundingClientRect()
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
      renderer.setSize(r.width, r.height, false)
      camera = frontCamera(r.width / r.height, 11)
    }
    const draw = (t: number) => {
      paintChat(reduce ? 6 : t % LOOP)
      phone.rotation.y = reduce ? 0.3 : Math.sin(t * 0.45) * 0.45
      phone.position.y = reduce ? 0 : Math.sin(t * 0.9) * 0.4
      renderer.render(scene, camera)
    }
    const start = () => {
      if (!unsub && visible && !reduce && !document.hidden) unsub = subscribe((t) => draw(t))
    }
    const stop = () => {
      unsub?.()
      unsub = null
    }
    const ready = document.fonts.load(`500 27px ${body}`).catch(() => undefined)
    fit()
    void ready.then(() => draw(0))
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
    return () => {
      stop()
      ro.disconnect()
      io.disconnect()
      renderer.dispose()
      cv.remove()
    }
  }, [chat])

  return <div ref={box} className="phone" />
}
