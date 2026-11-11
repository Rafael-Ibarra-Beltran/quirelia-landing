import { DIR_DOWN, DIR_H, DIR_L, DIR_R, DIR_UP, KIND_ACCENT, KIND_ARM, KIND_BODY, KIND_GLOW, KIND_STRAND, makeState, rasterize, type Grid, type JellySpec, type JellyState } from './species'
import { NA, NT, readPalette, type Palette, type RGB, type Scheme } from './palette'

export type Mode = 'pixel' | 'ascii'

/** A dissolve wave that spreads from (x, y) in CSS px. Cells inside the radius have already switched. */
export interface Wave {
  x: number
  y: number
  radius: number
  band: number
  toAscii: boolean
}

export interface FieldOptions {
  scheme: Scheme
  rays?: boolean // light shafts (pixel) or glyph rain (ascii)
  snow?: number // number of marine-snow particles
  surface?: boolean // draw the water line along one edge
  edge?: 'top' | 'bottom' // which edge the water line sits on (default bottom)
}

const GL = ' .,:;\'"`^-~_=+*!|/\\(){}tocxsS%X08#@·'
const G = (c: string) => GL.indexOf(c)
const DENS = Uint8Array.from(Array.from('.:;;ttoo%%SSXX88##@@'), G)
const SCRAMBLE = Uint8Array.from(Array.from('.:;tox%SX8#@+=*'), G)
const G_DOT = G('.')
const G_MID = G('·')
const G_COLON = G(':')
const G_SEMI = G(';')
const G_APOS = G("'")
const G_QUOT = G('"')
const G_COMMA = G(',')
const G_BAR = G('|')
const G_BANG = G('!')
const G_UP = G('/')
const G_DOWN = G('\\')
const G_DASH = G('-')
const G_TILDE = G('~')
const G_UNDER = G('_')
const G_STAR = G('*')
const G_AT = G('@')
const G_LP = G('(')
const G_RP = G(')')
const G_LB = G('{')
const G_RB = G('}')

const BAYER = Float32Array.from([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((n) => (n + 0.5) / 16))
const PIXEL_CELL = 4 // CSS px per pixel-art cell
const ASCII_FONT = 12
const ASCII_LINE = 14 // even: every glyph cell is two sample rows
const BS = 4 // bloom downsample
const TAU = Math.PI * 2

const hash = (x: number, y: number, s: number) => {
  let h = (Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s, 2147483647)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function makeGrid(W: number, H: number, cw: number, ch: number): Grid {
  const cols = Math.ceil(W / cw)
  const rows = Math.ceil(H / ch)
  return { cw, ch, cols, rows, val: new Float32Array(cols * rows), kind: new Uint8Array(cols * rows), dir: new Uint8Array(cols * rows) }
}

/** Two passes of a 1-2-1 blur in each axis, in place. */
function blur(a: Float32Array, tmp: Float32Array, w: number, h: number, passes: number) {
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      const o = y * w
      for (let x = 0; x < w; x++) tmp[o + x] = (a[o + (x > 0 ? x - 1 : x)] + 2 * a[o + x] + a[o + (x < w - 1 ? x + 1 : x)]) * 0.25
    }
    for (let y = 0; y < h; y++) {
      const o = y * w
      const up = y > 0 ? o - w : o
      const dn = y < h - 1 ? o + w : o
      for (let x = 0; x < w; x++) a[o + x] = (tmp[up + x] + 2 * tmp[o + x] + tmp[dn + x]) * 0.25
    }
  }
}

interface Flake {
  x: number
  y: number
  s: number
  v: number
  ph: number
}

export class Field {
  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private opts: Required<FieldOptions>
  private dpr = 1
  private W = 0
  private H = 0
  private pal: Palette | null = null
  private family = 'monospace'
  private atlas: Uint32Array | null = null // glyph sprites, one row per colour level
  private aw = 0
  private aimg: ImageData | null = null // full-resolution ASCII layer, allocated on first use
  private aout = new Uint32Array(0)
  private adrawn = new Uint8Array(0)
  private acv: HTMLCanvasElement | null = null
  private atlasDpr = 0
  private acw = 7
  private ach = 14
  private pc = 4
  private pg: Grid = makeGrid(1, 1, 1, 1)
  private ag: Grid = makeGrid(1, 1, 1, 1)
  private pcv = document.createElement('canvas')
  private pctx = this.pcv.getContext('2d')!
  private img: ImageData | null = null
  private out = new Uint32Array(0)
  private bloom = new Float32Array(0)
  private btmp = new Float32Array(0)
  private bw = 1
  private bh = 1
  private bix = new Uint16Array(0)
  private bfx = new Float32Array(0)
  private rayLut = new Float32Array(0)
  private bandI = new Int32Array(0)
  private bandT = new Uint8Array(0)
  private bandA = new Float32Array(0)
  private gv = new Float32Array(0)
  private gtmp = new Float32Array(0)
  private flakes: Flake[] = []
  private px = -1e9
  private py = -1e9
  private scroll = 0
  private time = 0
  jellies: JellyState[] = []
  /** Smoothed milliseconds spent in draw(); the page reads it to degrade gracefully. */
  ms = 0

  constructor(canvas: HTMLCanvasElement, specs: JellySpec[], opts: FieldOptions) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: true })!
    this.opts = { rays: false, snow: 0, surface: false, edge: 'bottom', ...opts }
    this.setJellies(specs)
  }

  /** Switch palette (for example when the page turns technical) and re-read its colours. */
  setScheme(scheme: Scheme) {
    if (this.opts.scheme === scheme) return Promise.resolve()
    this.opts.scheme = scheme
    return this.readTokens()
  }

  setJellies(specs: JellySpec[]) {
    this.jellies = specs.map(makeState).sort((a, b) => a.depth - b.depth)
  }

  /** Reads every colour and the mono family from CSS tokens. Call again after the theme changes. */
  async readTokens() {
    this.pal = readPalette(this.canvas, this.opts.scheme)
    this.family = getComputedStyle(this.canvas).getPropertyValue('--font-outlier').trim() || 'monospace'
    try {
      await document.fonts.load(`${ASCII_FONT * this.dpr}px ${this.family}`)
    } catch {
      /* generic monospace */
    }
    this.buildAtlas()
  }

  private buildAtlas() {
    const pal = this.pal
    if (!pal) return
    const font = `${ASCII_FONT * this.dpr}px ${this.family}`
    const m = document.createElement('canvas').getContext('2d')!
    m.font = font
    const cw = Math.max(4, Math.round(m.measureText('M').width))
    const ch = Math.round((ASCII_LINE * this.dpr) / 2) * 2
    const a = document.createElement('canvas')
    a.width = cw * GL.length
    a.height = ch * (NA + 2)
    const c = a.getContext('2d', { willReadFrequently: true })!
    c.textBaseline = 'middle'
    for (let b = 0; b < NA + 2; b++) {
      c.font = b >= NA - 3 ? `bold ${font}` : font // the bright cores get a heavier stroke
      if (b === NA + 1) {
        c.fillStyle = pal.asciiBox
        c.fillRect(0, b * ch + 1, a.width, ch - 2)
      }
      c.fillStyle = pal.ascii[b === NA + 1 ? NA - 1 : b]
      for (let i = 0; i < GL.length; i++) c.fillText(GL[i], i * cw, b * ch + ch / 2)
    }
    this.atlas = new Uint32Array(c.getImageData(0, 0, a.width, a.height).data.buffer)
    this.aw = a.width
    this.atlasDpr = this.dpr
    this.acw = cw
    this.ach = ch
    this.sizeAscii()
  }

  private sizeAscii() {
    this.ag = makeGrid(this.W, this.H, this.acw, this.ach / 2)
    const n = this.ag.cols * Math.ceil(this.ag.rows / 2)
    this.gv = new Float32Array(n)
    this.gtmp = new Float32Array(n)
    this.aimg = null
  }

  resize(cssW: number, cssH: number, dpr: number) {
    this.dpr = Math.min(2, dpr)
    this.W = Math.max(1, Math.round(cssW * this.dpr))
    this.H = Math.max(1, Math.round(cssH * this.dpr))
    this.canvas.width = this.W
    this.canvas.height = this.H
    const pc = (this.pc = Math.max(2, Math.round(PIXEL_CELL * this.dpr)))
    const g = (this.pg = makeGrid(this.W, this.H, pc, pc))
    const n = g.cols * g.rows
    this.pcv.width = g.cols
    this.pcv.height = g.rows
    this.img = this.pctx.createImageData(g.cols, g.rows)
    this.out = new Uint32Array(this.img.data.buffer)
    this.bw = Math.ceil(g.cols / BS) + 1
    this.bh = Math.ceil(g.rows / BS) + 1
    this.bloom = new Float32Array(this.bw * this.bh)
    this.btmp = new Float32Array(this.bw * this.bh)
    this.bix = new Uint16Array(g.cols)
    this.bfx = new Float32Array(g.cols)
    for (let col = 0; col < g.cols; col++) {
      const f = Math.max(0, (col + 0.5) / BS - 0.5)
      this.bix[col] = Math.min(this.bw - 2, Math.floor(f))
      this.bfx[col] = f - this.bix[col]
    }
    this.rayLut = new Float32Array(g.cols + g.rows + 2)
    this.bandI = new Int32Array(n)
    this.bandT = new Uint8Array(n)
    this.bandA = new Float32Array(n)
    if (this.pal && this.atlasDpr !== this.dpr) this.buildAtlas()
    else this.sizeAscii()
    const k = this.opts.snow
    if (this.flakes.length !== k) {
      this.flakes = Array.from({ length: k }, (_, i) => ({ x: hash(i, 1, 9), y: hash(i, 2, 9), s: hash(i, 3, 9) < 0.3 ? 2 : 1, v: 0.012 + hash(i, 4, 9) * 0.03, ph: hash(i, 5, 9) * TAU }))
    }
  }

  setPointer(x: number, y: number) {
    this.px = x * this.dpr
    this.py = y * this.dpr
  }
  leave() {
    this.px = this.py = -1e9
  }
  setScroll(y: number) {
    this.scroll = y * this.dpr
  }
  /** A click: every jelly is pushed away from the point and pulses. */
  impulse(x: number, y: number, strength = 1) {
    const X = x * this.dpr
    const Y = y * this.dpr
    for (const j of this.jellies) {
      const R = j.r * this.dpr
      const dx = j.px - X
      const dy = j.py - Y
      const d = Math.hypot(dx, dy) + 1
      const f = strength * R * 1.2 * Math.exp(-d / (R * 3.2))
      j.vx += (dx / d) * f
      j.vy += (dy / d) * f
      j.boost = Math.min(0.3, j.boost + 0.1 * Math.exp(-d / (R * 4)))
    }
  }

  /** Spring physics, drift, tilt and the lagging followers the strands trail towards. dt in seconds. */
  update(t: number, dt: number) {
    this.time = t
    const k1 = 1 - Math.exp(-dt / 0.45)
    const k2 = 1 - Math.exp(-dt / 1.4)
    for (const j of this.jellies) {
      const R = j.r * this.dpr
      const slow = 0.55 + 0.45 * j.depth
      const hx = j.x * this.W
      const hy = j.y * this.H - this.scroll * (0.08 + 0.35 * j.depth)
      const tx = Math.sin(t * 0.21 * slow + j.phase * 3) * 0.3 * R
      const ty = Math.cos(t * 0.17 * slow + j.phase * 2) * 0.22 * R
      let ax = (tx - j.ox) * 2.4 - j.vx * 1.7
      let ay = (ty - j.oy) * 2.4 - j.vy * 1.7
      const dx = hx + j.ox - this.px
      const dy = hy + j.oy - this.py
      const d = Math.hypot(dx, dy) + 1
      const lim = R * 1.6
      if (d < lim) {
        const k = (1 - d / lim) ** 2
        ax += (dx / d) * k * R * 2
        ay += (dy / d) * k * R * 2
      }
      j.vx += ax * dt
      j.vy += ay * dt
      j.ox += j.vx * dt
      j.oy += j.vy * dt
      j.boost = Math.max(0, j.boost - dt * 1.1)
      j.ph += dt * TAU * j.speed * (1 + j.boost * 0.15)
      j.px = hx + j.ox
      j.py = hy + j.oy
      const lean = Math.max(-0.4, Math.min(0.4, (j.vx / (R + 1)) * 0.6))
      const target = 0.15 * Math.sin(t * 0.19 * slow + j.phase * 5) + 0.08 * Math.sin(t * 0.07 + j.phase) + lean
      if (!j.init) {
        j.init = true
        j.f1x = j.f2x = j.px
        j.f1y = j.f2y = j.py
        j.tilt = target
      }
      j.tilt += (target - j.tilt) * Math.min(1, dt * 2)
      j.spin = j.phase + t * 0.045 * slow
      j.f1x += (j.px - j.f1x) * k1
      j.f1y += (j.py - j.f1y) * k1
      j.f2x += (j.px - j.f2x) * k2
      j.f2y += (j.py - j.f2y) * k2
      // a jump (resize, fast scroll) must not stretch the strands across the screen
      const m = 1.3 * R
      j.f1x = Math.max(j.px - m, Math.min(j.px + m, j.f1x))
      j.f1y = Math.max(j.py - m, Math.min(j.py + m, j.f1y))
      j.f2x = Math.max(j.px - m, Math.min(j.px + m, j.f2x))
      j.f2y = Math.max(j.py - m, Math.min(j.py + m, j.f2y))
    }
    for (const f of this.flakes) {
      f.y -= f.v * dt
      f.x += Math.sin(t * 0.6 + f.ph) * 0.04 * dt
      if (f.y < -0.02) f.y += 1.04
      if (f.x < 0) f.x += 1
      if (f.x > 1) f.x -= 1
    }
  }

  /** How far the wave has passed a point in device px: 0 not reached .. 1 fully switched. */
  private passed(w: Wave, x: number, y: number) {
    const d = Math.hypot(x / this.dpr - w.x, y / this.dpr - w.y)
    const s = (w.radius - d) / w.band
    return s < 0 ? 0 : s > 1 ? 1 : s
  }

  draw(mode: Mode, wave?: Wave) {
    if (!this.pal || !this.img) return
    const t0 = performance.now()
    const ctx = this.ctx
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.W, this.H)
    if (wave || mode === 'pixel') this.drawPixel(wave)
    if ((wave || mode === 'ascii') && this.atlas) this.drawAscii(wave)
    this.drawBand(mode, wave)
    this.ms = this.ms * 0.9 + (performance.now() - t0) * 0.1
  }

  /**
   * The water line, drawn last over either view. One band for both: its colour, thickness and swell blend from the plain look
   * (ivory, a gentle curve) to the technical one (dark paper, longer waves) column by column as the transition wave passes.
   */
  private drawBand(mode: Mode, wave?: Wave) {
    const pal = this.pal
    if (!this.opts.surface || !pal) return
    const pc = this.pc
    const cols = Math.ceil(this.W / pc)
    const rows = Math.ceil(this.H / pc)
    const top = this.opts.edge === 'top'
    const t = this.time
    const ctx = this.ctx
    const { fillS, fillT, foamS, foamT } = pal.band
    const mix = (a: number, b: number, m: number) => a + (b - a) * m
    const rgb = (a: RGB, b: RGB, m: number) => `rgb(${Math.round(mix(a[0], b[0], m))},${Math.round(mix(a[1], b[1], m))},${Math.round(mix(a[2], b[2], m))})`
    const yBand = top ? 4 * pc : this.H - 4 * pc
    for (let col = 0; col < cols; col++) {
      let m = mode === 'ascii' ? 1 : 0
      if (wave) {
        const s = this.passed(wave, (col + 0.5) * pc, yBand)
        m = wave.toAscii ? s : 1 - s
      }
      const wv = Math.round(mix(1.1, 3, m) * Math.sin(col * mix(0.21, 0.045, m) + t * mix(1.3, 0.7, m)) + mix(0.9, 1.5, m) * Math.sin(col * mix(0.08, 0.14, m) - t * mix(0.8, 1.1, m)))
      const foam = hash(col, 3, Math.floor(t * 2)) < mix(0.4, 0.35, m)
      const base = Math.round(mix(3, 6, m))
      const line = Math.max(1, Math.min(rows - 2, top ? base + wv : rows - base - wv))
      ctx.fillStyle = rgb(fillS, fillT, m)
      if (top) ctx.fillRect(col * pc, 0, pc, (line + 1) * pc)
      else ctx.fillRect(col * pc, line * pc, pc, (rows - line) * pc)
      ctx.fillStyle = rgb(foamS, foamT, m)
      ctx.globalAlpha = mix(0, 0.55, m) // a rim along the whole curve in the technical view
      ctx.fillRect(col * pc, (top ? line + 1 : line - 1) * pc, pc, pc)
      ctx.globalAlpha = 1
      if (foam) ctx.fillRect(col * pc, (top ? line + 2 : line - 2) * pc, pc, pc)
    }
  }

  private fill(g: Grid) {
    g.val.fill(0)
    g.kind.fill(0)
    g.dir.fill(0)
    for (const j of this.jellies) rasterize(j, g, this.dpr)
  }

  private drawPixel(wave?: Wave) {
    const pal = this.pal!
    const g = this.pg
    const { cols, rows, val, kind } = g
    const pc = this.pc
    const out = this.out
    const colors = pal.colors
    const t = this.time
    const ctx = this.ctx
    const deep = this.opts.scheme === 'deep'
    const lowQ = this.ms > 12
    this.fill(g)

    // bloom: a blurred low-resolution copy of the light, later quantised into dithered halo steps
    const { bloom, bw, bh, bix, bfx } = this
    const glow = !lowQ
    if (glow) {
      bloom.fill(0)
      for (let row = 0; row < rows; row++) {
        const o = (row >> 2) * bw
        const r = row * cols
        for (let col = 0; col < cols; col++) {
          const v = val[r + col]
          if (v > 0) bloom[o + (col >> 2)] += v > 1 ? 1 : v
        }
      }
      blur(bloom, this.btmp, bw, bh, 2)
    }
    const haloGain = (deep ? 5.2 : 2.6) / (BS * BS)

    const rays = this.opts.rays && deep && !lowQ
    const lut = this.rayLut
    if (rays) for (let m = 0; m < lut.length; m++) lut[m] = Math.max(0, Math.sin(m * 0.045 + t * 0.12)) * Math.max(0, Math.sin(m * 0.0137 + 1.7 - t * 0.05))
    const rayRows = rows * 0.9

    const scale = NT / pal.scale
    const frame = Math.floor(t * 20)
    const { bandI, bandT, bandA } = this
    let nb = 0

    for (let row = 0; row < rows; row++) {
      const r = row * cols
      const fyf = Math.max(0, (row + 0.5) / BS - 0.5)
      const iy = Math.min(bh - 2, Math.floor(fyf))
      const fy = fyf - iy
      const b0 = iy * bw
      const b1 = b0 + bw
      const rayFade = 1 - row / rayRows
      const rayOff = rows - Math.floor(row * 0.45)
      for (let col = 0; col < cols; col++) {
        const i = r + col
        let a = 0
        if (wave) {
          const s = this.passed(wave, (col + 0.5) * pc, (row + 0.5) * pc)
          a = wave.toAscii ? s : 1 - s
          if (a >= 1) {
            out[i] = 0
            continue
          }
        }
        const bay = BAYER[((row & 3) << 2) | (col & 3)]
        const v = val[i]
        if (v === 0) {
          let c = 0
          if (a === 0 || bay > a) {
            if (glow) {
              const x0 = bix[col]
              const fx = bfx[col]
              const top = bloom[b0 + x0] + (bloom[b0 + x0 + 1] - bloom[b0 + x0]) * fx
              const bot = bloom[b1 + x0] + (bloom[b1 + x0 + 1] - bloom[b1 + x0]) * fx
              const lv = ((top + (bot - top) * fy) * haloGain + bay * 0.9) | 0
              if (lv > 0) c = pal.halo[lv > 4 ? 4 : lv]
            }
            if (c === 0 && rays && rayFade > 0) {
              const lv = (lut[col + rayOff] * rayFade * 2.6 + bay * 0.7) | 0
              if (lv > 0) c = pal.ray[lv > 2 ? 2 : lv]
            }
          }
          out[i] = c
          continue
        }
        const k = kind[i]
        let idx: number
        if (k === KIND_ACCENT) idx = NT + 1
        else if (k === KIND_GLOW) idx = NT
        else {
          idx = (v * scale + (bay - 0.5) * 0.9) | 0
          if (k === KIND_BODY) {
            // selective outline: darker than the local tone on the shadow side, rim light on the lit side
            const shadow = (col < cols - 1 && val[i + 1] === 0) || (row < rows - 1 && val[i + cols] === 0)
            const lit = (col > 0 && val[i - 1] === 0) || (row > 0 && val[i - cols] === 0)
            if (deep) idx += lit ? 2 : shadow ? -3 : 0
            else if (shadow) idx += 5
            else if (lit) idx += 2
          } else if (deep) idx += 1
          if (idx < 1) idx = 1
          else if (idx >= NT) idx = NT - 1
        }
        if (a > 0) {
          out[i] = 0
          bandI[nb] = i
          bandT[nb] = idx
          bandA[nb++] = a
        } else out[i] = colors[idx]
      }
    }

    // marine snow
    const step = lowQ ? 2 : 1
    for (let n = 0; n < this.flakes.length; n += step) {
      const f = this.flakes[n]
      const y = (((f.y * this.H - this.scroll * 0.04 * f.s) % this.H) + this.H) % this.H
      const col = Math.floor((f.x * this.W) / pc)
      const row = Math.floor(y / pc)
      if (col >= cols || row >= rows) continue
      const i = row * cols + col
      if (val[i] !== 0) continue
      if (wave) {
        const s = this.passed(wave, (col + 0.5) * pc, (row + 0.5) * pc)
        if ((wave.toAscii ? s : 1 - s) > hash(col, row, 1)) continue
      }
      out[i] = pal.snow[f.s - 1]
    }

    this.pctx.putImageData(this.img!, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(this.pcv, 0, 0, cols, rows, 0, 0, cols * pc, rows * pc)

    // cells inside the wave band shrink and flicker away (or grow in)
    let last = -1
    for (let n = 0; n < nb; n++) {
      const i = bandI[n]
      const a = bandA[n]
      const col = i % cols
      const row = (i / cols) | 0
      if (hash(col, row, frame) < a * 0.45) continue
      const s = pc * (1 - a * a)
      if (s < 0.6) continue
      const idx = bandT[n]
      if (idx !== last) {
        ctx.fillStyle = pal.css[idx]
        last = idx
      }
      const o = (pc - s) / 2
      ctx.fillRect(col * pc + o, row * pc + o, s, s)
    }
  }

  private drawAscii(wave?: Wave) {
    const g = this.ag
    const { cols, cw, val, kind, dir } = g
    const ch = this.ach
    const rows = g.rows >> 1
    const atlas = this.atlas!
    const aw = this.aw
    const W = this.W
    const t = this.time
    const lowQ = this.ms > 12
    // glyphs are copied by hand into one ImageData: far cheaper than thousands of drawImage calls
    const cmax = Math.min(cols, Math.ceil(W / cw))
    const rmax = Math.min(rows, Math.ceil(this.H / ch))
    if (!this.aimg) {
      this.aimg = this.ctx.createImageData(W, this.H)
      this.aout = new Uint32Array(this.aimg.data.buffer)
      this.adrawn = new Uint8Array(cols * rows)
    }
    const aout = this.aout
    const drawn = this.adrawn
    const blit = (gi: number, lv: number, col: number, row: number) => {
      let src = lv * ch * aw + gi * cw
      let dst = row * ch * W + col * cw
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) aout[dst + x] = atlas[src + x]
        src += aw
        dst += W
      }
    }
    const frame = Math.floor(t * 14)
    const slow = Math.floor(t * 2.5)
    const gv = this.gv
    this.fill(g)

    // one brightness per glyph cell out of its two sample rows; blurred, it drives the aura
    for (let row = 0; row < rows; row++) {
      const o = row * 2 * cols
      for (let col = 0; col < cols; col++) {
        const a = val[o + col]
        const b = val[o + cols + col]
        gv[row * cols + col] = a > b ? a : b
      }
    }
    if (!lowQ) blur(gv, this.gtmp, cols, rows, 2)

    const flakeAt = new Map<number, number>()
    for (let i = 0; i < this.flakes.length; i++) {
      const f = this.flakes[i]
      const y = (((f.y * this.H - this.scroll * 0.04 * f.s) % this.H) + this.H) % this.H
      flakeAt.set(Math.floor(y / ch) * cols + Math.floor((f.x * this.W) / cw), f.s)
    }
    const rain = this.opts.rays && !lowQ
    const dens = DENS.length

    for (let row = 0; row < rmax; row++) {
      const oT = row * 2 * cols
      for (let col = 0; col < cmax; col++) {
        const ci = row * cols + col
        const was = drawn[ci]
        drawn[ci] = 0
        if (was) blit(0, 0, col, row) // glyph 0 is the space: clears what the last frame left here
        let flash = false
        let scramble = false
        if (wave) {
          const s = this.passed(wave, (col + 0.5) * cw, (row + 0.5) * ch)
          const a = wave.toAscii ? s : 1 - s
          if (a <= 0) continue
          if (a < 1) {
            const h = hash(col, row, 2)
            if (a < h * 0.85) continue
            flash = s < 0.4 && hash(col, row, frame) < 0.75
            scramble = a < h * 0.85 + 0.3
          }
        }
        const vt = val[oT + col]
        const vb = val[oT + cols + col]
        let gi: number
        let lv: number
        if (vt === 0 && vb === 0) {
          // background: aura, marine snow, glyph rain
          const fl = flakeAt.get(row * cols + col)
          const au = lowQ ? 0 : gv[row * cols + col]
          if (fl) {
            gi = fl > 1 ? G_MID : G_DOT
            lv = fl > 1 ? 3 : 2
          } else if (au > 0.02 && hash(col, row, 11) < au * 2.4) {
            gi = au > 0.16 && hash(col, row, 12) < 0.4 ? G_COLON : hash(col, row, 13) < 0.5 ? G_DOT : G_MID
            lv = au > 0.2 ? 1 : 0
          } else if (rain) {
            const h = hash(col, 1, 5)
            if (h > 0.06) continue
            const head = ((t * (0.05 + h * 0.5) + h * 40) % 1) * (rows + 8)
            const k = Math.floor(head) - row
            if (k < 0 || k > 6) continue
            gi = k === 0 ? G_BAR : k < 3 ? G_BANG : G_COLON
            lv = k === 0 ? 1 : 0
          } else continue
        } else {
          const top = vt >= vb
          const iM = top ? oT + col : oT + cols + col
          const k = kind[iM]
          const d = dir[iM]
          let v = (top ? vt : vb) * 0.7 + (vt + vb) * 0.15
          if (k !== KIND_STRAND && k !== KIND_GLOW && k !== KIND_ACCENT) {
            // thin glass stays empty: the body is drawn by its rims, organs and folds
            v = (v - 0.13) * 1.3
            if (v <= 0.02 + 0.05 * hash(col, row, 21)) continue
          }
          v += 0.035 * Math.sin(t * 2.2 + col * 0.7 + row * 1.3)
          const half = vb === 0 ? 1 : vt === 0 ? 2 : 0 // 1 = only the top sample, 2 = only the bottom one
          lv = (v * NA * 1.45 + 0.6) | 0
          if (lv < 0) lv = 0
          else if (lv >= NA) lv = NA - 1
          if (k === KIND_ACCENT) {
            gi = G_STAR
            lv = NA
          } else if (k === KIND_GLOW) {
            gi = G_AT
            lv = NA + 1
          } else if (k === KIND_STRAND) {
            if (d === DIR_UP) gi = G_UP
            else if (d === DIR_DOWN) gi = G_DOWN
            else if (d === DIR_H) gi = half === 2 ? G_UNDER : half === 1 ? G_QUOT : v > 0.4 ? G_TILDE : G_DASH
            else if (half === 1) gi = G_APOS
            else if (half === 2) gi = v > 0.3 ? G_COMMA : G_DOT
            else gi = v > 0.4 ? G_BAR : v > 0.24 ? G_BANG : hash(col, row, 4) < 0.5 ? G_COLON : G_SEMI
            if (lv < 1) lv = 1
          } else {
            if (k === KIND_ARM && d === DIR_L && v < 0.3) gi = hash(col, row, 6) < 0.7 ? G_LP : G_LB
            else if (k === KIND_ARM && d === DIR_R && v < 0.3) gi = hash(col, row, 6) < 0.7 ? G_RP : G_RB
            else {
              let n = (v * dens * 0.98) | 0
              if (hash(col, row, slow) < 0.06) n += hash(col, row, 7) < 0.5 ? 1 : -1
              if (n < 0) n = 0
              else if (n >= dens) n = dens - 1
              if (n < 4 && half) gi = half === 1 ? (n < 2 ? G_APOS : G_QUOT) : n < 2 ? G_DOT : G_COMMA
              else gi = DENS[n]
            }
            if (v > 0.8) lv = NA + 1
          }
        }
        if (scramble) gi = SCRAMBLE[(hash(col, row, frame) * SCRAMBLE.length) | 0]
        if (flash) lv = NA + 1
        blit(gi, lv, col, row)
        drawn[ci] = 1
      }
    }

    if (wave) {
      // over the pixel layer: needs real compositing, so go through a canvas
      if (!this.acv) this.acv = document.createElement('canvas')
      const acv = this.acv
      if (acv.width !== W || acv.height !== this.H) {
        acv.width = W
        acv.height = this.H
      }
      acv.getContext('2d')!.putImageData(this.aimg, 0, 0)
      this.ctx.drawImage(acv, 0, 0)
    } else this.ctx.putImageData(this.aimg, 0, 0)
  }
}
