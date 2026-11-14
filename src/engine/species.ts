// Jellyfish model. Each jelly is a translucent body of revolution plus strands, rasterised into a grid of
// cells (pixel-art cells or half-row ASCII cells). Local units are bell radii; the origin is the margin centre.

export type Species = 'moon' | 'nettle' | 'comb' | 'crown'

export interface JellySpec {
  species: Species
  x: number // 0..1 of the canvas width
  y: number // 0..1 of the canvas height (bell margin)
  r: number // bell radius in CSS px
  phase: number
  speed: number // pulses per second
  depth: number // 0 far .. 1 near: parallax, dimming
  tint?: 0 | 1 // 1 adds a small coral detail
}

export interface Strand {
  th: number // longitude of the attach point around the margin
  rad: number // radial attach position, 1 = margin
  v0: number // attach height (0 = margin plane, negative = inside the bell)
  len: number
  amp: number
  k: number // wave number, radians per bell radius
  ph: number
  width: number
  type: 0 | 1 | 2 // tentacle, oral arm (ribbon), tentacle with side branches
  sh: number // brightness
  fix: boolean // does not rotate with the body
}

export interface JellyState extends JellySpec {
  px: number
  py: number
  ox: number
  oy: number
  vx: number
  vy: number
  ph: number // accumulated pulse phase
  boost: number // pulse boost from the cursor, decays
  f1x: number // low-passed positions: the strands trail towards them
  f1y: number
  f2x: number
  f2y: number
  tilt: number
  spin: number
  init: boolean
  sy: number
  strands: Strand[]
}

export interface Grid {
  cw: number
  ch: number
  cols: number
  rows: number
  val: Float32Array // 0 = empty, else optical density / brightness 0.03..1.3
  kind: Uint8Array // KIND_*
  dir: Uint8Array // DIR_*: glyph hint for the ASCII renderer
}

export const KIND_BODY = 1
export const KIND_STRAND = 2
export const KIND_ACCENT = 3
export const KIND_GLOW = 4
export const KIND_ARM = 5

export const DIR_V = 1
export const DIR_UP = 2 // "/"
export const DIR_DOWN = 3 // "\"
export const DIR_H = 4
export const DIR_L = 5 // left edge of a ribbon
export const DIR_R = 6

const TAU = Math.PI * 2
const sm = (x: number) => {
  const t = x < 0 ? 0 : x > 1 ? 1 : x
  return t * t * (3 - 2 * t)
}
/** Bell contraction 0..1: quick squeeze, slower release, then a glide. */
function pulse(p: number) {
  p -= Math.floor(p)
  return p < 0.26 ? sm(p / 0.26) : 1 - sm((p - 0.26) / 0.5)
}

interface Shape {
  W: number
  H: number
  a: number
  b: number
  tuck: number // how much the margin curls back in: the rounded underside
  E: number // ellipse factor of the margin (view from slightly above)
  amt: number // margin contraction
  grow: number
  wall: number // mesoglea thickness at the apex
  lap: number // margin lappets
}
const SHAPE: Record<Species, Shape> = {
  moon: { W: 1.04, H: 1.0, a: 2.5, b: 2.0, tuck: 0.13, E: 0.34, amt: 0.2, grow: 0.1, wall: 0.2, lap: 0 },
  nettle: { W: 1.0, H: 1.22, a: 2.5, b: 2.0, tuck: 0.15, E: 0.3, amt: 0.2, grow: 0.09, wall: 0.24, lap: 16 },
  crown: { W: 0.94, H: 1.3, a: 3.2, b: 2.5, tuck: 0.1, E: 0.3, amt: 0.14, grow: 0.07, wall: 0.2, lap: 8 },
  comb: { W: 1.4, H: 1.1, a: 2, b: 2, tuck: 0, E: 0.16, amt: 0, grow: 0, wall: 0, lap: 0 },
}

function rng(seed: number) {
  let s = Math.floor(seed * 1000 + 7) >>> 0
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 2246822519) + 374761393) >>> 0
    s = (Math.imul(s ^ (s >>> 13), 3266489917) + 668265263) >>> 0
    return ((s ^ (s >>> 16)) >>> 0) / 4294967296
  }
}

function makeStrands(sp: Species, seed: number): Strand[] {
  const r = rng(seed)
  const out: Strand[] = []
  const add = (s: Partial<Strand> & Pick<Strand, 'th' | 'len'>) =>
    out.push({ rad: 1, v0: 0, amp: 0.1, k: 2.6, ph: r() * TAU, width: 0.012, type: 0, sh: 0.5, fix: false, ...s })
  if (sp === 'moon') {
    for (let i = 0; i < 84; i++) add({ th: ((i + r() * 0.6) / 84) * TAU, len: 0.5 + r() * 0.45, amp: 0.035, k: 5, sh: 0.5 })
    for (let i = 0; i < 4; i++) add({ th: i * (TAU / 4) + 0.5, rad: 0.2, v0: -0.3, len: 1.7 + r() * 0.5, amp: 0.13, k: 2.6 + r(), width: 0.2, type: 1, sh: 0.8 })
  } else if (sp === 'nettle') {
    for (let i = 0; i < 26; i++) add({ th: ((i + r() * 0.5) / 26) * TAU, len: 3.2 + r() * 1.6, amp: 0.09 + r() * 0.09, k: 1.8 + r() * 1.4, width: 0.014, sh: 0.56 })
    for (let i = 0; i < 4; i++) add({ th: i * (TAU / 4) + 0.7, rad: 0.24, v0: -0.4, len: 3.0 + r() * 0.9, amp: 0.2 + r() * 0.08, k: 1.7 + r() * 0.6, width: 0.26, type: 1, sh: 0.85 })
  } else if (sp === 'crown') {
    for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) add({ th: Math.PI / 4 + c * (TAU / 4) + (k - 1.5) * 0.09, len: 2.6 + r() * 1.2, amp: 0.1 + r() * 0.05, k: 2 + r(), width: 0.022, sh: 0.62 })
    for (let i = 0; i < 4; i++) add({ th: i * (TAU / 4) + 0.3, rad: 0.2, v0: -0.45, len: 1.3 + r() * 0.4, amp: 0.1, k: 3, width: 0.2, type: 1, sh: 0.72 })
  } else {
    for (const th of [-Math.PI / 2, Math.PI / 2]) add({ th, rad: 0.82, v0: -0.6, len: 3.6 + r() * 0.5, amp: 0.3, k: 1.5 + r() * 0.3, width: 0.016, type: 2, sh: 0.6, fix: true })
  }
  return out
}

export function makeState(spec: JellySpec, index: number): JellyState {
  return { ...spec, px: 0, py: 0, ox: 0, oy: 0, vx: 0, vy: 0, ph: spec.phase, boost: 0, f1x: 0, f1y: 0, f2x: 0, f2y: 0, tilt: 0, spin: spec.phase, init: false, sy: 0, strands: makeStrands(spec.species, spec.phase + index * 0.37) }
}

// scratch buffers, rebuilt for every jelly
const N = 64
const LW = new Float32Array(N + 2) // half width of the bell at latitude q
const LS = new Float32Array(N + 2) // how much the surface faces sideways
const LC = new Float32Array(N + 2) // how much it faces up
const MAXN = 128
const NX = new Float32Array(MAXN + 1)
const NY = new Float32Array(MAXN + 1)
const SIN = new Float32Array(2048)
for (let i = 0; i < 2048; i++) SIN[i] = Math.sin((i / 2048) * TAU)
const ASIN = new Float32Array(1026)
for (let i = 0; i < 1026; i++) ASIN[i] = Math.asin(Math.min(1, Math.max(-1, (i - 512) / 512)))
const SK = 2048 / TAU
// table lookups: precise enough for texture, several times cheaper than Math.sin in the per-cell loops
const fsin = (x: number) => SIN[(x * SK) & 2047]
const fcos = (x: number) => SIN[(x * SK + 512) & 2047]
const ROWX = new Float32Array(8)
const ROWZ = new Float32Array(8)
const GX = new Float32Array(4)
const GY = new Float32Array(4)
const GF = new Float32Array(4)

function lut(L: Float32Array, q: number) {
  const f = q * N
  const i = f | 0
  return L[i] + (L[i + 1] - L[i]) * (f - i)
}

function profile(S: Shape, comb: boolean, cB: number, cM: number, H: number) {
  for (let i = 0; i <= N; i++) {
    const q = i / N
    if (comb) {
      // plump body, widest below the middle, with a flattened mouth end
      LW[i] = S.W * Math.pow(1 - Math.pow(Math.abs(2 * q - 1), 2.6), 0.5) * (0.62 + 0.38 * q)
    } else {
      const m = sm((q - 0.6) / 0.4)
      LW[i] = S.W * Math.pow(1 - Math.pow(1 - q, S.a), 1 / S.b) * (1 - S.tuck * m * m * (1 + 1.2 * cM)) * (1 - 0.03 * cB - S.amt * cM * q * q)
    }
  }
  LW[N + 1] = LW[N]
  for (let i = 0; i <= N; i++) {
    const d = (LW[Math.min(N, i + 1)] - LW[Math.max(0, i - 1)]) * (i === 0 || i === N ? N : N / 2)
    const hyp = Math.sqrt(H * H + d * d)
    LS[i] = H / hyp
    LC[i] = d / hyp
  }
  LS[N + 1] = LS[N]
  LC[N + 1] = LC[N]
}

function put(g: Grid, x: number, y: number, v: number, kind: number, dir: number) {
  if (x < 0 || y < 0) return
  const col = x | 0
  const row = y | 0
  if (col >= g.cols || row >= g.rows) return
  const i = row * g.cols + col
  if (v > g.val[i]) {
    g.val[i] = v
    g.kind[i] = kind
    g.dir[i] = dir
  }
}

function thinLine(g: Grid, x0: number, y0: number, x1: number, y1: number, v: number, wide: boolean) {
  const dx = x1 - x0
  const dy = y1 - y0
  const ax = Math.abs(dx * g.cw)
  const ay = Math.abs(dy * g.ch)
  const dir = ax < 0.45 * ay ? DIR_V : ay < 0.45 * ax ? DIR_H : dx * dy > 0 ? DIR_DOWN : DIR_UP
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))))
  for (let k = 0; k < steps; k++) {
    const f = k / steps
    const x = x0 + dx * f
    const y = y0 + dy * f
    put(g, x, y, v, KIND_STRAND, dir)
    if (wide) put(g, x + 1, y, v * 0.8, KIND_STRAND, dir)
  }
}

/** Draw one jelly into the grid. `dpr` converts its CSS radius to grid px. */
export function rasterize(j: JellyState, g: Grid, dpr: number) {
  const R = j.r * dpr
  if (R < 2) return
  const sp = j.species
  const S = SHAPE[sp]
  const comb = sp === 'comb'
  const id = sp === 'moon' ? 0 : sp === 'nettle' ? 1 : comb ? 2 : 3
  const p = j.ph / TAU
  const cB = comb ? 0 : pulse(p)
  const cM = comb ? 0 : pulse(p - 0.1)
  const H = S.H * (1 + S.grow * cB - 0.04 * cM)
  profile(S, comb, cB, cM, H)
  let maxW = 0
  for (let i = 0; i <= N; i++) if (LW[i] > maxW) maxW = LW[i]
  const depth = j.depth < 0 ? 0 : j.depth > 1 ? 1 : j.depth
  const gain = 0.36 + 0.64 * depth
  const near = depth > 0.45
  const tilt = j.tilt
  const cs = Math.cos(tilt)
  const sn = Math.sin(tilt)
  const bob = comb ? 0 : (pulse(p - 0.16) - 0.35) * 0.1 * R
  const cx = j.px + sn * bob
  const cy = j.py - cs * bob
  const E = S.E
  const hwM = comb ? lut(LW, 0.7) : LW[N]
  const spin = j.spin
  const { cw, ch, cols, rows, val, kind, dir } = g
  const lod = R / cw
  const stride = lod < 7 ? 3 : lod < 14 ? 2 : 1
  const f1x = j.f1x - j.px
  const f1y = j.f1y - j.py
  const f2x = j.f2x - j.px
  const f2y = j.f2y - j.py

  // ---- far half of the margin, seen through the bell ----
  if (!comb) {
    const nA = Math.ceil((hwM * R * 2) / cw)
    for (let i = 0; i <= nA; i++) {
      const u = -hwM + (2 * hwM * i) / nA
      const v = -E * Math.sqrt(Math.max(0, hwM * hwM - u * u))
      put(g, (cx + (u * cs - v * sn) * R) / cw, (cy + (u * sn + v * cs) * R) / ch, 0.5 * gain, KIND_BODY, DIR_H)
    }
  }

  // ---- strands: tentacles and oral arms, drawn first so the bell is composited over them ----
  for (let si = 0; si < j.strands.length; si++) {
    const s = j.strands[si]
    if (s.type === 0 && stride > 1 && si % stride) continue
    const th = s.fix ? s.th : s.th + spin
    const cf = Math.cos(th)
    const bx = s.rad * hwM * Math.sin(th)
    const by = s.v0 + E * s.rad * hwM * cf
    const n = Math.max(5, Math.min(MAXN, Math.ceil((s.len * R) / (ch * 3))))
    for (let i = 0; i <= n; i++) {
      const d = i / n
      const sl = d * s.len
      const cl = comb ? 0 : pulse(p - 0.14 - 0.4 * d)
      const env = d < 0.12 ? d / 0.12 : 1
      const a1 = s.k * sl - j.ph * 0.8 + s.ph
      const lat = s.amp * env * (0.35 + 0.65 * d) * (Math.sin(a1) + 0.4 * Math.sin(a1 * 2.3 + 1.7))
      const xl = bx * (1 - 0.22 * sm(d * 1.5)) * (1 - 0.3 * cl * env) + lat
      const yl = by + sl * (1 - 0.05 * cl)
      const te = tilt * (1 - 0.8 * sm(d * 1.3))
      const ct = 1 - te * te * 0.5
      const st = te - te * te * te * 0.1667
      const lag = sm(d * 1.6)
      const g2 = lag * d * 0.7
      const g1 = lag - g2
      NX[i] = (cx + (xl * ct - yl * st) * R + f1x * g1 + f2x * g2) / cw
      NY[i] = (cy + (xl * st + yl * ct) * R + f1y * g1 + f2y * g2) / ch
    }
    const front = 0.72 + 0.28 * cf
    if (s.type === 1) {
      // frilled ribbon: width breathes with the twist, both edges ruffle independently
      const wc = (s.width * R) / cw
      for (let i = 0; i < n; i++) {
        const dx = NX[i + 1] - NX[i]
        const dy = NY[i + 1] - NY[i]
        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))))
        for (let k = 0; k < steps; k++) {
          const f = k / steps
          const d = (i + f) / n
          const sl = d * s.len
          const y = NY[i] + dy * f
          if (y < 0 || y >= rows) continue
          const x = NX[i] + dx * f
          const taper = sm(d / 0.07) * (1 - 0.72 * Math.pow(d, 1.4))
          const twist = 0.62 + 0.38 * Math.abs(fsin(sl * 1.7 + s.ph))
          const w = Math.max(0.6, wc * taper * twist)
          const wl = w * (1 + 0.18 * fsin(sl * 43 + s.ph) + 0.1 * fsin(sl * 97 + s.ph * 2))
          const wr = w * (1 + 0.18 * fsin(sl * 37 + s.ph * 3) + 0.1 * fsin(sl * 89 + s.ph))
          const a = Math.max(0, Math.floor(x - wl))
          const b = Math.min(cols - 1, Math.floor(x + wr))
          const row = y | 0
          const fade = s.sh * gain * front * (1 - 0.45 * d)
          for (let col = a; col <= b; col++) {
            const e = (col + 0.5 - x) / (col + 0.5 < x ? wl : wr)
            const ae = e < 0 ? -e : e
            let v = 0.26 + 0.6 * ae * ae + 0.22 * Math.max(0, fsin(e * 4.2 + sl * 9 + s.ph)) + 0.16 * Math.max(0, -e)
            if (ae < 0.72 && fsin(e * 8 + s.ph * 3) * fsin(sl * 19 + e * 3) > 0.5) v *= 0.4
            v *= fade
            const ix = row * cols + col
            if (v > val[ix]) {
              val[ix] = v
              kind[ix] = KIND_ARM
              dir[ix] = b - a >= 3 ? (col === a ? DIR_L : col === b ? DIR_R : 0) : 0
            }
          }
        }
      }
    } else {
      const wide = (s.width * R) / cw > 0.85
      for (let i = 0; i < n; i++) {
        const d = i / n
        const v = s.sh * gain * front * (1 - 0.7 * Math.pow(d, 1.5)) * (0.74 + 0.26 * Math.sin(d * s.len * 34 + s.ph))
        thinLine(g, NX[i], NY[i], NX[i + 1], NY[i + 1], v, wide && d < 0.6)
        // tentilla: fine side branches that all hang the same way
        if (s.type === 2 && i > 2 && (lod > 12 || i % 2 === 0)) {
          const l = (0.34 * R * (1 - 0.5 * d)) / ch
          const sw = Math.sin(i * 0.9 - j.ph * 0.7) * 0.25 * l
          thinLine(g, NX[i], NY[i], NX[i] + sw + (0.12 * R * (s.th > 0 ? 1 : -1)) / cw, NY[i] + l, v * 0.6, false)
        }
      }
    }
  }

  // ---- species details that are precomputed per frame ----
  if (id === 2) {
    for (let k = 0; k < 8; k++) {
      ROWX[k] = Math.sin(spin * 2 + (k * TAU) / 8)
      ROWZ[k] = Math.cos(spin * 2 + (k * TAU) / 8)
    }
  }
  if (id === 0) {
    const rho = 0.34 * lut(LW, 0.5)
    for (let k = 0; k < 4; k++) {
      const a = spin + (k * TAU) / 4
      GX[k] = rho * Math.sin(a)
      GY[k] = 0.52 * H + E * rho * Math.cos(a)
      GF[k] = 0.75 + 0.25 * Math.cos(a)
    }
  }
  const ga = 0.19 * S.W
  const gb = ga * 0.62

  // ---- bell ----
  const vn = Math.sqrt(1 + E * E)
  const SE = E / vn
  const CE = 1 / vn
  const invR = 1 / R
  const invH = 1 / H
  const ext = Math.hypot(maxW, H) * R
  const r0 = Math.max(0, Math.floor((cy - ext) / ch))
  const r1 = Math.min(rows - 1, Math.ceil((cy + ext) / ch))
  const c0 = Math.max(0, Math.floor((cx - ext) / cw))
  const c1 = Math.min(cols - 1, Math.ceil((cx + ext) / cw))
  const vMax = H + E * maxW + 0.02
  const tol = 1 + (0.5 * ch) / (R * H)
  const wall = S.wall
  const lap = S.lap
  for (let row = r0; row <= r1; row++) {
    const dy = (row + 0.5) * ch - cy
    for (let col = c0; col <= c1; col++) {
      const dx = (col + 0.5) * cw - cx
      const u = (dx * cs + dy * sn) * invR
      if (u > maxW || u < -maxW) continue
      const vA = (-dx * sn + dy * cs) * invR + H
      if (vA < 0 || vA > vMax) continue
      // invert the projection: which latitude q of the front surface is under this cell
      let q = vA * invH
      if (q > 1) q = 1
      let w = 0
      let x = 0
      let cz = 0
      let qr = q
      for (let it = 0; it < 3; it++) {
        w = lut(LW, q)
        x = u / w
        const x2 = x * x
        cz = x2 < 1 ? Math.sqrt(1 - x2) : 0
        qr = (vA - E * w * cz) * invH
        q = qr < 0 ? 0 : qr > 1 ? 1 : qr
      }
      w = lut(LW, q)
      x = u / w
      if (!(x * x < 1) || qr > tol) continue
      cz = Math.sqrt(1 - x * x)
      const th = ASIN[(x * 512 + 512.5) | 0]
      if (lap && q > 1 - 0.05 * (1 - Math.abs(fsin(lap * 0.5 * (th + spin))))) continue
      if (comb && q > 1 - 0.13 / (1 + (x / 0.3) * (x / 0.3))) continue // cleft between the two oral lobes

      const sl = lut(LS, q)
      const cl = lut(LC, q)
      let nz = cz * sl * CE + cl * SE
      if (nz < 0) nz = 0
      const fr = 1 - nz
      const rim = fr * fr * fr
      const nl = -0.5 * x * sl + 0.65 * cl + 0.57 * cz * sl
      const nh = -0.3 * x * sl + 0.5 * cl + 0.81 * cz * sl
      let sp2 = nh > 0 ? nh * nh : 0
      sp2 *= sp2
      sp2 *= sp2
      sp2 *= sp2
      sp2 *= sp2
      sp2 *= sp2
      sp2 *= sp2
      let v = 0.04 + 0.13 * (nl > 0 ? nl : 0) + 0.9 * rim
      let a = 0.25 + 0.65 * rim
      let k = KIND_BODY

      if (!comb) {
        // inner wall: the subumbrella, a second dome under a thick layer of jelly
        const q2 = (vA * invH - wall) / (1 - wall)
        let cavity = false
        if (q2 > 0 && q2 <= 1) {
          const x2 = u / (lut(LW, q2) * 0.84)
          if (x2 * x2 < 1) {
            cavity = true
            let f2 = 1 - Math.sqrt(1 - x2 * x2) * lut(LS, q2) * CE - lut(LC, q2) * SE
            if (f2 < 0) f2 = 0
            f2 = f2 * f2 * f2
            v += 0.42 * f2
            a += 0.2 * f2
          }
        }
        if (!cavity) v += 0.06 + 0.08 * (1 - q)
        // thick rolled margin
        const mb = sm((q - 0.86) / 0.14)
        v += 0.3 * mb
        a += 0.3 * mb
        if (j.tint === 1 && q > 0.95 && q < 0.985 && fcos(8 * (th + spin)) > 0.994) k = KIND_ACCENT
      }

      if (id === 1) {
        // radial stripes, front and (fainter) back
        const env = sm((q - 0.1) / 0.18) * (1 - 0.6 * sm((q - 0.88) / 0.12))
        const st = fcos(16 * (th + spin))
        if (st > 0.35) {
          v += 0.4 * (st - 0.35) * 1.5 * env * (0.5 + 0.5 * cz)
          a += 0.3 * env
        }
        const sb = fcos(16 * (Math.PI - th + spin))
        if (sb > 0.5) v += 0.14 * env
        // gastric pouches
        const gq = 1 - (u / (0.5 * S.W)) * (u / (0.5 * S.W)) - ((vA - 0.58 * H) / (0.24 * H)) * ((vA - 0.58 * H) / (0.24 * H))
        if (gq > 0) {
          const tex = 0.65 + 0.35 * fsin(u * 23 + spin * 3) * fsin(vA * 19)
          v += 0.42 * gq * tex
          a += 0.35 * gq
        }
      } else if (id === 0) {
        if (q > 0.4 && fcos(40 * (th + spin)) > 0.82) v += 0.13 * sm((q - 0.4) / 0.2)
        // four gonad horseshoes around the stomach
        if (vA > 0.25 * H && vA < 0.85 * H) {
          for (let n = 0; n < 4; n++) {
            const ex = (u - GX[n]) / ga
            const ey = (vA - GY[n]) / gb
            const dd = ex * ex + ey * ey
            if (dd < 1 && dd > 0.5) {
              v += 0.42 * GF[n]
              a += 0.4
            } else if (dd <= 0.5) v += 0.07
          }
        }
      } else if (id === 3) {
        // corner ridges, gastric filaments and a banded crown under the apex
        const ax = x < 0 ? -x : x
        if (Math.abs(ax - 0.7) < 0.035 && q > 0.12) v += 0.24
        if (q > 0.17 && q < 0.23) v += 0.1 + 0.12 * (fcos(24 * (th + spin)) > 0 ? 1 : 0)
        const gq = 1 - (u / (0.42 * S.W)) * (u / (0.42 * S.W)) - ((vA - 0.55 * H) / (0.2 * H)) * ((vA - 0.55 * H) / (0.2 * H))
        if (gq > 0) {
          v += 0.4 * gq * (0.6 + 0.4 * fsin(u * 31) * fsin(vA * 23 + spin))
          a += 0.3 * gq
        }
        if (q > 0.82 && q < 0.85 && (ax < 0.022 || Math.abs(ax - 0.93) < 0.015)) k = j.tint === 1 ? KIND_ACCENT : KIND_GLOW
      } else {
        // comb jelly: eight meridian rows of beating combs over lobed flesh
        const lobe = fcos(8 * th + spin * 16)
        v += 0.2 * lobe * (1 - rim) * cz + 0.12 * sm((q - 0.75) / 0.25)
        if (q > 0.07 && q < 0.9) {
          for (let n = 0; n < 8; n++) {
            const ddx = (x - ROWX[n]) * w * R
            if (ddx < cw * 0.8 && ddx > -cw * 0.8) {
              const plate = fsin(q * H * R * (2.2 / ch)) > -0.3
              const beat = fsin(q * 13 - j.ph * 2.2 + n * 0.8)
              if (ROWZ[n] > 0) {
                v += plate ? 0.4 + 0.4 * (beat > 0 ? beat : 0) : 0.1
                a += 0.3
                if (plate && beat > 0.86 && near) k = j.tint === 1 && beat > 0.985 ? KIND_ACCENT : KIND_GLOW
              } else v += plate ? 0.14 : 0.04
            }
          }
        }
        // pharynx and tentacle sheaths seen inside
        const au = u < 0 ? -u : u
        const core = 1 - (u / 0.16) * (u / 0.16) - ((vA - 0.42 * H) / (0.3 * H)) * ((vA - 0.42 * H) / (0.3 * H))
        if (core > 0) v += 0.4 * core
        const shq = (vA * invH - 0.45) / 0.3
        if (shq > 0 && shq < 1 && Math.abs(au - 0.12 - shq * 0.5 * maxW) < 0.03) v += 0.09
        if (q > 0.02 && q < 0.06 && au < 0.1) k = KIND_GLOW
      }

      if (sp2 > 0.55 && near && k === KIND_BODY) k = KIND_GLOW
      if (v > 1.25) v = 1.25
      if (a > 0.94) a = 0.94
      v *= gain
      const i = row * cols + col
      const old = val[i] * (1 - a)
      val[i] = old + v
      if (k !== KIND_BODY || v > old * 0.8) {
        kind[i] = k
        dir[i] = 0
      }
    }
  }
}
