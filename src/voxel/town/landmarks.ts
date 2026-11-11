// Landmarks and street furniture of the Tijuana map. Voxels are half a world unit.
import { Builder, type Model } from '../models'
import { P } from './palette'
import { text, textWidth } from './font'

const hash = (n: number) => {
  const h = Math.sin(n * 127.1) * 43758.5453
  return h - Math.floor(h)
}

/**
 * La Bola (CECUT), from the photographs: a sand-orange dome on a raised stage, with a dark door at its foot, a short
 * walkway and stairs straight in front, two low curved terraces at the sides and two tall sloped panels behind. Voxels are a
 * quarter unit here. Origin: the sphere's centre; +z is the front.
 */
export const BOLA_R = 30
export const BOLA_HB = 8 // height of the stage the sphere rests on
export function bola(): Model {
  const b = new Builder()
  const R = BOLA_R
  const HB = BOLA_HB
  const deg = (r: number) => (r * 180) / Math.PI
  type Cell = [number, number] | null // height, colour
  const field = (x: number, z: number): Cell => {
    const d = Math.hypot(x, z)
    const th = Math.abs(deg(Math.atan2(x, z)))
    let best: Cell = null
    const put = (h: number, c: number) => {
      if (!best || h > best[0]) best = [h, c]
    }
    if (d <= R + 4) put(HB, P.BOLA_STEP) // the stage
    // wide steps going down in a half circle in front of the door
    if (d > R + 4 && d <= R + 28 && th < 100) put(HB - 2 * (1 + Math.floor((d - (R + 4) - 0.01) / 6)), P.PLAZA)
    // curved walls hugging the sphere at the sides, sloping down towards the front
    if (d > R + 4 && d <= R + 9 && th >= 100 && th < 165) put(HB + 8 - Math.round(((th - 100) / 65) * 6), P.BOLA_STEP)
    if (d > R + 4 && d <= R + 9 && th >= 60 && th < 100) put(HB + 2 + Math.round(((th - 60) / 40) * 6), P.BOLA_STEP)
    // the long building behind
    if (Math.abs(x) <= 52 && z >= -34 && z <= -24) put(20, z === -24 ? P.BOLA : P.BOLA_STEP)
    return best
  }
  const H = (x: number, z: number) => field(x, z)?.[0] ?? 0
  for (let x = -66; x <= 66; x++) for (let z = -36; z <= 66; z++) {
    const c = field(x, z)
    if (!c) continue
    const low = Math.min(H(x + 1, z), H(x - 1, z), H(x, z + 1), H(x, z - 1))
    for (let y = Math.max(0, Math.min(low, c[0] - 1)); y < c[0]; y++) b.set(x, y, z, c[1])
  }
  // the dome: a hollow sphere whose lower part is cut flush with the stage, so it reads as a dome a bit taller than a half sphere
  const cy = HB + 14
  for (let i = -R; i <= R; i++) for (let j = HB - cy; j <= R; j++) for (let k = -R; k <= R; k++) {
    const d = i * i + j * j + k * k
    if (d <= R * R + 0.5 && d > (R - 1.6) * (R - 1.6)) b.set(i, cy + j, k, P.BOLA)
  }
  // the doorway at its foot, with a frame
  b.del(-8, HB, 12, 16, 18, 24)
  b.box(-8, HB, 16, 16, 18, 1, P.INK)
  b.box(-10, HB, 18, 2, 20, 6, P.BOLA_STEP).box(8, HB, 18, 2, 20, 6, P.BOLA_STEP).box(-10, HB + 18, 18, 20, 2, 6, P.BOLA_STEP)
  return b.done()
}

/** The Arco of Avenida Revolucion: one slender steel arch with stay cables and a hanging screen. Spans x. Origin: its centre. */
export function arco(): Model {
  const b = new Builder()
  const a = 16
  const H = 74
  const arc = (u: number) => H * (1 - u * u)
  for (let i = 0; i <= 700; i++) {
    const u = -1 + (2 * i) / 700
    const x = Math.round(u * a)
    const y = Math.round(arc(u))
    const t = Math.abs(u) < 0.45 ? 2 : 3
    b.box(x - 1, y - 1, 0, t, t, t, P.STEEL)
  }
  for (let k = -9; k <= 9; k += 2) {
    const u = k / 10
    const x = u * a
    b.line([x, arc(u), 1], [-x * 0.55, 8 + arc(u) * 0.12, 1], P.SLATE)
  }
  b.shell(-9, 26, 0, 18, 7, 3, P.STEEL).box(-7, 27, 3, 14, 5, 1, P.INK).box(-9, 27, 3, 2, 5, 1, P.TERRA).box(7, 27, 3, 2, 5, 1, P.TERRA)
  for (const x of [-7, 7]) b.line([x, 33, 1], [x, arc(x / a) - 1, 1], P.SLATE)
  b.box(-a - 3, 0, -1, 6, 4, 5, P.CONCRETE).box(a - 3, 0, -1, 6, 4, 5, P.CONCRETE)
  return b.done()
}

/** The border wall: rusty bollards, rails, a concrete base and painted mural panels. Runs along x. Origin: its centre. */
export function wall(len: number, murals: [number, number][]): Model {
  const b = new Builder()
  b.box(0, 0, 0, len, 3, 4, P.CONCRETE)
  for (let x = 1; x < len - 1; x += 3) b.box(x, 3, 1, 2, 20, 2, P.RUST)
  b.box(0, 8, 1, len, 1, 2, P.RUST).box(0, 18, 1, len, 1, 2, P.RUST).box(0, 23, 1, len, 2, 3, P.RUST)
  const bright = [P.RED, P.TAXI, P.TEAL, P.PINK, P.WHITE, P.LEAF, P.BLUE]
  for (const [x0, w] of murals) {
    b.box(x0, 3, 3, w, 20, 1, P.BLUE)
    for (let x = 0; x < w; x += 3) {
      const col = Math.floor(hash(x0 + x) * bright.length)
      const top = 6 + Math.floor(hash(x0 * 3 + x) * 10)
      b.box(x0 + x, 3, 3, 3, top, 1, bright[col])
      b.box(x0 + x, 3 + top, 3, 3, 2, 1, P.WHITE)
    }
    b.box(x0 + Math.floor(w / 2) - 2, 14, 4, 5, 5, 1, P.TAXI) // a sun
  }
  return b.done()
}

/** The bullring by the sea: a cream ring with arches, a terracotta band and tiered seats inside. Origin: its centre. */
export function bullring(): Model {
  const b = new Builder()
  const R = 22
  for (let i = -R; i <= R; i++) for (let k = -R; k <= R; k++) {
    const d = Math.hypot(i, k)
    if (d > R + 0.3) continue
    const ang = Math.atan2(k, i)
    const sector = (((ang + Math.PI) / (2 * Math.PI)) * 22) % 1
    if (d > R - 2) {
      for (let y = 0; y < 12; y++) {
        const arch = sector > 0.25 && sector < 0.75 && y > 1 && y < 8
        if (!arch) b.set(i, y, k, y > 9 ? P.TERRA : P.CREAM)
        else if (d > R - 1.2) b.set(i, y, k, P.INK)
      }
      b.set(i, 12, k, P.WHITE)
    } else if (d > R - 8) {
      const h = 1 + Math.floor((d - (R - 8)) * 0.9)
      for (let y = 0; y < h; y++) b.set(i, y, k, y === h - 1 ? P.TERRA : P.CREAM)
    }
  }
  return b.done()
}

/** The monument to Cuauhtemoc: a tiered stone pedestal and a bronze figure with a spear. Origin: its centre. */
export function monument(): Model {
  const b = new Builder()
  b.box(-6, 0, -6, 12, 3, 12, P.CONCRETE).box(-4, 3, -4, 8, 12, 8, P.CONCRETE).box(-3, 15, -3, 6, 2, 6, P.WHITE)
  const y = 17
  b.box(-2, y, -1, 2, 6, 2, P.DKGREEN).box(0, y, -1, 2, 6, 2, P.DKGREEN) // legs
  b.box(-2, y + 6, -1, 4, 6, 2, P.DKGREEN).box(-4, y + 8, -1, 2, 2, 2, P.DKGREEN).box(2, y + 8, -1, 2, 2, 2, P.DKGREEN)
  b.box(-1, y + 12, -1, 2, 3, 2, P.DKGREEN).box(-2, y + 15, -1, 4, 2, 2, P.TAXI)
  for (let h = 0; h < 22; h++) b.set(4, y + 6 + h, 0, P.WOOD)
  b.set(4, y + 28, 0, P.STEEL).set(4, y + 29, 0, P.STEEL)
  return b.done()
}

/** Big standing letters, each one a different colour. */
export function letters(s: string): Model {
  const b = new Builder()
  const w = textWidth(s, 2)
  b.box(-1, 0, -1, w + 2, 2, 5, P.CONCRETE)
  for (let z = 0; z < 3; z++) text(b, s, 0, 2, z, [P.RED, P.TAXI, P.TEAL, P.BLUE, P.PINK, P.LEAF], 2)
  return b.done()
}

/** A donkey painted as a zebra, pulling a small painted cart. Facing +x. */
export function zonkey(): Model {
  const b = new Builder()
  b.box(0, 4, 0, 10, 4, 3, P.WHITE)
  for (let x = 1; x < 10; x += 2) b.box(x, 4, 0, 1, 4, 3, P.INK)
  for (const [x, z] of [[0, 0], [0, 2], [8, 0], [8, 2]]) {
    b.box(x, 0, z, 2, 4, 1, P.WHITE)
    b.set(x, 1, z, P.INK).set(x, 3, z, P.INK)
  }
  b.box(10, 6, 0, 4, 3, 3, P.WHITE).box(13, 6, 0, 1, 2, 3, P.SLATE).box(10, 9, 0, 1, 2, 1, P.INK).box(10, 9, 2, 1, 2, 1, P.INK) // head and ears
  b.set(-1, 6, 1, P.INK).set(-1, 5, 1, P.INK) // tail
  b.box(-14, 2, -1, 12, 1, 5, P.WOOD)
  b.box(-14, 3, -1, 12, 3, 1, P.TAXI).box(-14, 3, 3, 12, 3, 1, P.TEAL)
  for (let x = -13; x < -3; x += 3) b.box(x, 3, 3, 2, 3, 1, P.RED)
  for (const x of [-12, -5]) for (let y = -3; y <= 3; y++) for (let z = -1; z <= 1; z++) if (y * y + z * z <= 9) b.set(x, 3 + y, -2 + (z + 1) * 0 + (z > 0 ? 5 : 0), P.INK)
  b.box(-2, 3, 1, 3, 1, 1, P.WOOD)
  return b.done()
}

/** A car facing +z. */
export function car(color: number): Model {
  const b = new Builder()
  b.box(0, 1, 0, 5, 2, 11, color).box(0, 3, 2, 5, 2, 6, color)
  b.box(0, 3, 3, 1, 1, 4, P.GLASS).box(4, 3, 3, 1, 1, 4, P.GLASS).box(1, 3, 8, 3, 1, 1, P.GLASS).box(1, 3, 2, 3, 1, 1, P.GLASS)
  b.box(1, 5, 4, 3, 1, 2, P.WHITE)
  for (const [x, z] of [[0, 1], [4, 1], [0, 8], [4, 8]]) b.box(x, 0, z, 1, 1, 2, P.INK)
  b.box(0, 1, 10, 5, 1, 1, P.SLATE).set(0, 2, 10, P.WHITE).set(4, 2, 10, P.WHITE).set(0, 2, 0, P.RED).set(4, 2, 0, P.RED)
  return b.done()
}

/** A ficus with a white-painted trunk and a round, trimmed crown, as on Revolucion. */
export function ficus(): Model {
  const b = new Builder()
  b.box(0, 0, 0, 2, 7, 2, P.WHITE).box(-1, 0, -1, 4, 1, 4, P.CONCRETE)
  b.hball(1, 12, 1, 6, P.LEAF).hball(1, 12, 1, 4, P.DKGREEN)
  return b.done()
}

export function palm(): Model {
  const b = new Builder()
  for (let y = 0; y < 22; y++) b.set(0, y, y > 16 ? 1 : 0, y % 3 === 0 ? P.SAND : P.WOOD)
  const top: [number, number, number] = [0, 22, 1]
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2
    b.line(top, [Math.cos(a) * 7, 17, 1 + Math.sin(a) * 7], P.LEAF)
    b.line([Math.cos(a) * 3.5, 21, 1 + Math.sin(a) * 3.5], [Math.cos(a) * 6, 20, 1 + Math.sin(a) * 6], P.DKGREEN)
  }
  b.set(0, 21, 2, P.WOOD).set(1, 21, 1, P.WOOD)
  return b.done()
}

/** A street lamp with two round globes. */
export function lamp(): Model {
  const b = new Builder()
  b.box(0, 0, 0, 1, 14, 1, P.INK).box(-3, 14, 0, 7, 1, 1, P.INK)
  b.ball(-3, 16, 0, 1, P.WHITE).ball(3, 16, 0, 1, P.WHITE)
  return b.done()
}

/** A market stall with a striped umbrella. */
export function stall(a: number = P.RED, c: number = P.WHITE): Model {
  const b = new Builder()
  b.box(0, 3, 0, 8, 1, 4, P.WOOD).box(0, 0, 0, 1, 3, 1, P.WOOD).box(7, 0, 0, 1, 3, 1, P.WOOD).box(0, 0, 3, 1, 3, 1, P.WOOD).box(7, 0, 3, 1, 3, 1, P.WOOD)
  b.box(1, 4, 1, 2, 1, 2, P.TAXI).box(4, 4, 1, 2, 1, 2, P.RED).box(1, 5, 2, 1, 1, 1, P.LEAF)
  for (let y = 0; y < 12; y++) b.set(4, 4 + y, -1, P.INK)
  for (let r = 6; r >= 1; r--) for (let i = -r; i <= r; i++) for (let k = -r; k <= r; k++) if (i * i + k * k <= r * r + 1) b.set(4 + i, 16 - (6 - r), -1 + k, (i + k + 20) % 4 < 2 ? a : c)
  return b.done()
}

/** The border crossing: a long concrete canopy over booths. Faces +z. */
export function garita(): Model {
  const b = new Builder()
  const w = 64
  b.box(0, 15, 0, w, 2, 20, P.CONCRETE).box(0, 17, 0, w, 3, 1, P.BLUE)
  text(b, 'MEXICO', 2, 17, 1, P.WHITE, 1)
  for (let x = 2; x < w; x += 12) b.box(x, 0, 14, 3, 15, 3, P.CONCRETE)
  for (const x of [8, 28, 48]) b.shell(x, 0, 6, 8, 9, 6, P.WHITE).box(x + 1, 3, 12, 6, 4, 1, P.GLASS)
  b.box(0, 0, 18, w, 1, 2, P.TAXI)
  return b.done()
}

/** A sun umbrella for the beach. */
export function umbrella(a: number, c: number): Model {
  const b = new Builder()
  for (let y = 0; y < 9; y++) b.set(0, y, 0, P.WOOD)
  for (let r = 5; r >= 1; r--) for (let i = -r; i <= r; i++) for (let k = -r; k <= r; k++) if (i * i + k * k <= r * r + 1) b.set(i, 14 - r, k, (i + k + 20) % 4 < 2 ? a : c)
  return b.done()
}
