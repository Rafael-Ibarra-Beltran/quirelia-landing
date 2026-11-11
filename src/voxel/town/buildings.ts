// Art deco shopfronts for Avenida Revolucion, and the four places of the list as open-front models.
// Voxels are half a world unit; the front faces +z; the body spans x 0..w-1, z 0..d-1.
import { Builder, type Model } from '../models'
import { P } from './palette'
import { text, textWidth } from './font'

const GH = 17 // ground floor height: an opening 9 high, a lintel and a sign band 5 high above it
const FH = 9 // upper floor height

export interface BuildingOpts {
  w?: number
  d?: number
  floors: number
  wall: number
  trim?: number
  stripe?: number // vertical pilasters of another colour
  awning?: [number, number]
  sign?: string
  signBg?: number
  signFg?: number
  base?: number // colour of the shopfront's low wall
  balconies?: boolean
  back?: boolean // laundry, air conditioners and pipes on the back (seen from the east side)
  seed?: number
  open?: boolean // no front wall on the ground floor: the room inside can be seen
}

const rnd = (n: number) => {
  const h = Math.sin(n * 91.345) * 43758.5453
  return h - Math.floor(h)
}

function tinaco(b: Builder, x: number, y: number, z: number) {
  b.box(x - 1, y, z - 1, 1, 2, 1, P.SLATE).box(x + 1, y, z - 1, 1, 2, 1, P.SLATE).box(x - 1, y, z + 1, 1, 2, 1, P.SLATE).box(x + 1, y, z + 1, 1, 2, 1, P.SLATE)
  b.cyl(x, y + 2, z, 2, 4, P.INK).cyl(x, y + 6, z, 1, 1, P.SLATE)
}
const ac = (b: Builder, x: number, y: number, z: number) => b.box(x, y, z, 3, 2, 2, P.WHITE).box(x, y + 1, z, 3, 1, 1, P.SLATE)

export function shellBuilding(o: BuildingOpts): Builder {
  const b = new Builder()
  const w = o.w ?? 24
  const d = o.d ?? 20
  const trim = o.trim ?? P.WHITE
  const H = GH + (o.floors - 1) * FH
  const seed = o.seed ?? 1
  b.shell(0, 0, 0, w, H, d, o.wall)
  b.box(0, H - 1, 0, w, 1, d, P.ROOF) // roof deck
  b.walls(0, H, 0, w, 2, d, trim) // parapet
  b.walls(-1, H - 1, -1, w + 2, 1, d + 2, trim) // cornice
  b.walls(-1, GH - 1, -1, w + 2, 1, d + 2, trim) // floor band
  b.walls(0, 0, 0, w, 1, d, P.CONCRETE) // plinth

  if (o.stripe !== undefined) for (let x = 0; x < w; x += 7) b.box(Math.min(x, w - 2), GH, d, 2, H - GH, 1, o.stripe)

  const [a1, a2] = o.awning ?? [P.RED, P.WHITE]
  if (!o.open) {
    // storefront: glass between dark mullions, a low wall, a door
    const door = Math.floor(w / 2) - 2
    b.box(1, 1, d - 1, w - 2, 1, 1, o.base ?? P.BRICK)
    for (let x = 2; x < w - 2; x++) {
      const inDoor = x >= door && x < door + 4
      for (let y = 2; y < 9; y++) b.set(x, y, d - 1, inDoor ? (y < 8 ? P.WOOD : P.GLASS) : x % 6 === 0 ? P.INK : P.GLASS)
    }
    b.box(door, 2, d, 4, 7, 1, P.INK).box(door + 1, 3, d, 2, 5, 1, P.GLASS)
    b.box(1, 1, d, 1, 8, 1, trim).box(w - 2, 1, d, 1, 8, 1, trim)
    for (let x = 0; x < w; x++) {
      const c = x % 4 < 2 ? a1 : a2
      b.set(x, 10, d, c).set(x, 10, d + 1, c).set(x, 9, d + 2, c).set(x, 9, d + 3, c).set(x, 8, d + 4, c)
    }
    b.box(0, 8, d + 4, w, 1, 1, P.INK)
  } else {
    // the front of the ground floor is cut away, with no awning, so the room inside can be seen
    b.del(2, 1, d - 1, w - 4, 9, 1)
    b.box(1, 1, d - 1, 1, 9, 1, trim).box(w - 2, 1, d - 1, 1, 9, 1, trim)
    for (let x = 0; x < w; x++) b.set(x, 10, d - 1, trim).set(x, 10, d, x % 4 < 2 ? a1 : a2).set(x, 10, d + 1, x % 4 < 2 ? a1 : a2) // lintel and a thin canopy
    b.box(1, 10, 1, w - 2, 1, d - 2, P.CREAM) // ceiling of the room
  }

  // sign band and text
  if (o.sign) {
    const tw = textWidth(o.sign)
    b.box(2, 11, d, w - 4, 5, 1, o.signBg ?? P.INK)
    if (tw <= w - 4) text(b, o.sign, Math.floor((w - tw) / 2), 11, d + 1, o.signFg ?? P.WHITE, 1)
  }

  // upper floors: recessed windows with a frame and sill
  for (let f = 1; f < o.floors; f++) {
    const y0 = GH + (f - 1) * FH + 2
    for (let x = 3, n = 0; x + 4 <= w - 2; x += 7, n++) {
      b.box(x - 1, y0 + 6, d, 6, 1, 1, trim) // lintel
      b.box(x, y0, d - 1, 4, 6, 1, P.GLASS)
      if (rnd(seed + f * 7 + n) > 0.55) b.box(x, y0 + 4, d - 1, 4, 2, 1, P.CREAM) // a blind half down
      b.box(x, y0 + 2, d - 1, 4, 1, 1, P.SLATE) // a glazing bar
      b.box(x - 1, y0 - 1, d, 6, 1, 2, trim) // sill
    }
    if (o.balconies && f === 2) {
      b.box(2, y0 - 2, d, w - 4, 1, 3, trim)
      for (let x = 2; x < w - 2; x += 2) b.box(x, y0 - 1, d + 2, 1, 2, 1, P.INK)
      b.box(2, y0 + 1, d + 2, w - 4, 1, 1, P.INK)
    }
  }
  // side windows (both sides) and back windows
  for (let f = 1; f < o.floors; f++) {
    const y0 = GH + (f - 1) * FH + 2
    for (let z = 3; z + 3 <= d - 2; z += 7) b.box(0, y0, z, 1, 5, 3, P.GLASS).box(w - 1, y0, z, 1, 5, 3, P.GLASS)
    for (let x = 3; x + 4 <= w - 2; x += 7) {
      b.box(x, y0, 0, 4, 5, 1, P.GLASS)
      if (o.back && rnd(seed * 3 + x + f) > 0.4) ac(b, x, y0 - 1, -1)
    }
  }
  if (o.back) {
    for (let z = 2; z < d - 2; z += 5) b.box(w, 1, z, 1, H - 2, 1, P.SLATE)
    b.box(w, GH + 2, 3, 1, 6, 10, P.GLASS)
  }
  if (!o.open) {
    if (rnd(seed) > 0.3) tinaco(b, 4 + Math.floor(rnd(seed + 2) * (w - 10)), H + 1, 4 + Math.floor(rnd(seed + 3) * (d - 10)))
    if (rnd(seed + 5) > 0.4) ac(b, w - 8, H + 1, d - 6)
  }
  return b
}

export const building = (o: BuildingOpts): Model => shellBuilding(o).done()

/** The anchor to centre the body of a building (not its awning or what spills onto the pavement). */
export const bodyOrigin = (o: { w?: number; d?: number }): [number, number] => [(o.w ?? 24) / 2, (o.d ?? 20) / 2]

/** A yellow hotel with cobalt pilasters and iron balconies, like the one on Revolucion. */
export const hotel = (seed = 2): BuildingOpts => ({ floors: 4, wall: P.MUSTARD, trim: P.WHITE, stripe: P.BLUE, balconies: true, sign: 'HOTEL', signBg: P.BLUE, awning: [P.BLUE, P.WHITE], seed })

// ---- pieces shared by the four places ----

interface Look { shirt?: number; pants?: number; skin?: number; hair?: number }
/** A 6 voxel person facing +z. `up` raises both arms; `seated` bends the legs forward. */
export function figure(b: Builder, x: number, y: number, z: number, l: Look = {}, o: { up?: boolean; seated?: boolean } = {}) {
  const { shirt = P.RED, pants = P.DENIM, skin = P.SKIN1, hair = P.HAIR } = l
  if (o.seated) {
    b.box(x, y + 1, z, 2, 1, 2, pants).box(x, y, z + 1, 1, 1, 1, pants).box(x + 1, y, z + 1, 1, 1, 1, pants)
    y -= 1
    b.box(x, y + 3, z, 2, 2, 1, shirt)
    b.box(x, y + 5, z, 2, 2, 1, skin).set(x, y + 6, z, hair).set(x + 1, y + 6, z, hair)
    b.box(x - 1, y + 3, z, 1, 2, 1, shirt).box(x + 2, y + 3, z, 1, 2, 1, shirt)
    return
  }
  b.box(x, y, z, 1, 2, 1, pants).box(x + 1, y, z, 1, 2, 1, pants)
  b.box(x, y + 2, z, 2, 2, 1, shirt)
  b.box(x, y + 4, z, 2, 2, 1, skin).set(x, y + 5, z, hair).set(x + 1, y + 5, z, hair)
  if (o.up) b.box(x - 1, y + 3, z, 1, 3, 1, shirt).box(x + 2, y + 3, z, 1, 3, 1, shirt)
  else b.box(x - 1, y + 2, z, 1, 2, 1, shirt).box(x + 2, y + 2, z, 1, 2, 1, shirt)
}

const ICON: Record<string, number> = { Y: P.TAXI, R: P.RED, G: P.LEAF, W: P.WHITE, K: P.INK, S: P.STEEL, B: P.WOOD, O: P.ORANGE }
/** A 7x7 icon on a hanging sign that sticks out from the left edge of the front, readable from the -x side. */
function bladeSign(b: Builder, rows: string[], d: number, bg: number) {
  const y0 = GH + 3
  b.box(-1, y0 + 8, d - 1, 1, 1, 10, P.INK) // the bracket
  b.box(-1, y0, d + 1, 1, 8, 8, bg)
  rows.forEach((r, i) => [...r].forEach((ch, k) => ICON[ch] !== undefined && b.set(-1, y0 + 7 - i, d + 1 + k, ICON[ch])))
}

const TACO = ['.......', '..YYY..', '.YRYRY.', 'YGRGRGY', 'YYYYYYY', '.YYYYY.', '.......']
const DUMBBELL = ['.......', 'K.....K', 'KK...KK', 'KSSSSSK', 'KK...KK', 'K.....K', '.......']
const APPLE = ['...G...', '..GRG..', '.RRRRR.', 'RRRRRRR', 'RRRRRRR', '.RRRRR.', '..R.R..']
const CUP = ['..W.W..', '.W.W...', 'WWWWWW.', 'WBBBBWW', 'WBBBBW.', '.WWWW..', 'WWWWWW.']

const tile = (b: Builder, x: number, z: number, w: number, d: number, c1: number, c2: number) => {
  for (let i = 0; i < w; i++) for (let k = 0; k < d; k++) b.set(x + i, 0, z + k, (i + k) % 2 ? c1 : c2)
}
const room = (b: Builder, wall: number, side: number) => {
  b.box(1, 1, 1, 22, 9, 1, wall).box(1, 1, 1, 1, 9, 18, side).box(22, 1, 1, 1, 9, 18, side)
}

/** A taqueria: counter with a trompo and a griddle, tables, a waiter, tables and a trompo stand on the pavement, a giant taco on the roof. */
export function restaurant(): Model {
  const o: BuildingOpts = { floors: 3, wall: P.ORANGE, trim: P.WHITE, sign: 'TACOS', signBg: P.RED, awning: [P.RED, P.WHITE], open: true, seed: 8 }
  const b = shellBuilding(o)
  const H = GH + 2 * FH
  tile(b, 1, 1, 22, 18, P.RED, P.WHITE)
  room(b, P.CREAM, P.CREAM)
  b.box(3, 1, 2, 17, 4, 3, P.RED).box(3, 5, 2, 17, 1, 3, P.WHITE)
  for (let x = 4; x < 19; x += 2) b.set(x, 3, 5, P.WHITE).set(x, 2, 5, P.WHITE)
  b.cyl(6, 6, 3, 1, 3, P.BRICK).set(6, 9, 3, P.TAXI) // the trompo
  b.box(10, 6, 2, 8, 1, 3, P.INK).box(11, 7, 3, 2, 1, 1, P.ORANGE).box(14, 7, 3, 2, 1, 1, P.ORANGE)
  b.box(3, 7, 1, 18, 3, 1, P.INK)
  for (let x = 5; x < 20; x += 3) b.box(x, 9, 1, 2, 1, 1, P.WHITE).box(x, 8, 1, 3, 1, 1, P.TAXI)
  for (let x = 3; x < 21; x++) b.set(x, 9, 6 + (x % 2), x % 3 === 0 ? P.RED : P.LEAF) // a garland of chillies
  for (const x of [4, 10, 16]) {
    b.box(x, 3, 10, 3, 1, 3, P.WOOD).box(x + 1, 1, 11, 1, 2, 1, P.WOOD)
    b.box(x - 1, 1, 11, 1, 3, 1, P.RED).box(x + 3, 1, 11, 1, 3, 1, P.RED)
  }
  figure(b, 13, 1, 7, { shirt: P.WHITE, pants: P.INK, hair: P.INK })
  figure(b, 5, 1, 14, { shirt: P.TEAL, hair: P.WOOD }, { seated: true })
  figure(b, 17, 1, 14, { shirt: P.PINK, skin: P.SKIN2 }, { seated: true })
  // on the pavement
  for (const x of [3, 9]) {
    b.box(x, 1, 24, 1, 3, 1, P.INK).box(x - 1, 4, 23, 3, 1, 3, P.WHITE)
    b.box(x - 3, 1, 24, 1, 2, 1, P.RED).box(x + 3, 1, 24, 1, 2, 1, P.RED)
  }
  b.box(15, 1, 22, 7, 3, 4, P.RED).box(15, 4, 22, 7, 1, 4, P.WHITE) // a trompo stand
  b.cyl(18, 5, 24, 1, 4, P.BRICK).set(18, 9, 24, P.TAXI)
  bladeSign(b, TACO, 20, P.WHITE)
  // a giant taco on the roof
  const cx = 12
  for (let x = -8; x <= 8; x++) {
    const hy = Math.round(Math.sqrt(Math.max(0, 64 - x * x)) * 0.8)
    for (let z = 6; z < 12; z++) {
      b.set(cx + x, H + 2 + hy, z, P.TAXI).set(cx + x, H + 2 + hy - 1, z, P.TAXI)
      if (Math.abs(x) < 6 && hy > 1) b.set(cx + x, H + 2 + hy - 2, z, (x + z) % 3 === 0 ? P.RED : P.LEAF)
    }
  }
  return b.done()
}

/** A gym: mirror, treadmills with runners, a bench and a rack, a giant dumbbell on the roof. */
export function gym(): Model {
  const o: BuildingOpts = { floors: 3, wall: P.DENIM, trim: P.WHITE, stripe: P.TAXI, sign: 'GYM', signBg: P.INK, signFg: P.TAXI, awning: [P.TAXI, P.INK], open: true, seed: 11 }
  const b = shellBuilding(o)
  const H = GH + 2 * FH
  for (let x = 1; x < 23; x++) for (let z = 1; z < 19; z++) b.set(x, 0, z, (x >> 1) % 2 ? P.SLATE : P.CONCRETE)
  room(b, P.CREAM, P.CREAM)
  b.box(2, 2, 1, 20, 8, 1, P.GLASS).box(2, 1, 1, 20, 1, 1, P.WHITE) // the mirror
  for (let i = 0; i < 4; i++) {
    const x = 3 + i * 5
    b.box(x, 1, 3, 3, 1, 9, P.WHITE).box(x, 2, 4, 3, 1, 7, P.SLATE)
    b.box(x, 3, 3, 1, 4, 1, P.RED).box(x + 2, 3, 3, 1, 4, 1, P.RED).box(x, 7, 3, 3, 1, 1, P.INK).set(x + 1, 7, 3, P.TAXI)
  }
  figure(b, 4, 3, 8, { shirt: P.RED, pants: P.INK, hair: P.WOOD })
  figure(b, 14, 3, 7, { shirt: P.TAXI, pants: P.INK, skin: P.SKIN3, hair: P.INK })
  b.box(2, 1, 14, 3, 2, 5, P.RED) // a bench
  b.box(0, 5, 14, 9, 1, 1, P.STEEL).box(0, 3, 14, 1, 5, 1, P.INK).box(8, 3, 14, 1, 5, 1, P.INK)
  b.box(19, 1, 4, 3, 3, 12, P.SLATE) // a rack of dumbbells
  for (let z = 4; z < 16; z += 2) b.set(19, 4, z, P.RED).set(20, 4, z, P.INK)
  figure(b, 12, 1, 14, { shirt: P.TEAL, pants: P.INK, hair: P.HAIR }, { up: true })
  bladeSign(b, DUMBBELL, 20, P.TAXI)
  // a giant dumbbell on the roof
  const y = H + 2
  b.box(5, y + 2, 9, 14, 1, 1, P.STEEL)
  for (const x of [3, 5, 17, 19]) b.box(x, y, 7, 1, 5, 5, x === 3 || x === 19 ? P.RED : P.INK)
  return b.done()
}

/** A fruit shop: shelves of fruit inside, crates of fruit on the pavement, a giant apple on the roof. */
export function shop(): Model {
  const o: BuildingOpts = { floors: 3, wall: P.CREAM, trim: P.WHITE, stripe: P.TEAL, sign: 'FRUTA', signBg: P.LEAF, awning: [P.TAXI, P.WHITE], open: true, seed: 4 }
  const b = shellBuilding(o)
  const H = GH + 2 * FH
  for (let x = 1; x < 23; x++) for (let z = 1; z < 19; z++) b.set(x, 0, z, P.WOOD)
  room(b, P.CREAM, P.CREAM)
  const fruit = [P.RED, P.ORANGE, P.TAXI, P.LEAF, P.RED, P.PINK, P.TAXI]
  for (const y of [2, 5, 8]) {
    b.box(2, y, 1, 20, 1, 3, P.WOOD)
    for (let x = 2; x < 22; x++) b.box(x, y + 1, 1, 1, 1, 3, fruit[(x * 7 + y) % fruit.length])
  }
  b.box(13, 1, 11, 8, 3, 3, P.WOOD).box(13, 4, 11, 8, 1, 3, P.WHITE).box(15, 5, 12, 2, 1, 1, P.STEEL)
  figure(b, 11, 1, 13, { shirt: P.LEAF, pants: P.DENIM, hair: P.INK, skin: P.SKIN2 })
  figure(b, 6, 1, 12, { shirt: P.PINK, pants: P.INK, hair: P.HAIR })
  for (const x of [3, 10, 17]) {
    b.box(x, 1, 22, 6, 2, 5, P.WOOD)
    for (let i = 0; i < 6; i++) for (let k = 0; k < 5; k++) b.set(x + i, 3, 22 + k, fruit[(i * 3 + k * 5 + x) % fruit.length])
  }
  b.box(2, 1, 20, 1, 7, 1, P.WOOD).box(23, 1, 20, 1, 7, 1, P.WOOD)
  bladeSign(b, APPLE, 20, P.WHITE)
  // a giant apple on the roof
  b.hball(12, H + 6, 10, 4, P.RED).hball(12, H + 6, 10, 3, P.RED)
  b.box(12, H + 10, 10, 1, 2, 1, P.WOOD).box(13, H + 11, 10, 3, 1, 2, P.LEAF)
  return b.done()
}

/** A cafe with a person working on a project: a laptop, papers and a big lit bulb above. A giant cup on the roof. */
export function cafe(): Model {
  const o: BuildingOpts = { floors: 3, wall: P.PINK, trim: P.WHITE, sign: 'CAFE', signBg: P.WOOD, awning: [P.WHITE, P.PINK], open: true, seed: 15 }
  const b = shellBuilding(o)
  const H = GH + 2 * FH
  for (let x = 1; x < 23; x++) for (let z = 1; z < 19; z++) b.set(x, 0, z, (x + z) % 2 ? P.WOOD : P.CREAM)
  room(b, P.CREAM, P.PINK)
  b.box(3, 1, 2, 14, 4, 3, P.WOOD).box(3, 5, 2, 14, 1, 3, P.WHITE)
  b.box(5, 6, 2, 4, 3, 2, P.STEEL).box(5, 8, 2, 4, 1, 2, P.INK).box(12, 6, 2, 5, 2, 3, P.GLASS)
  for (let x = 12; x < 17; x++) b.set(x, 6, 3, x % 2 ? P.PINK : P.TAXI)
  for (const x of [6, 12, 18]) { b.set(x, 9, 8, P.INK); b.ball(x, 8, 8, 1, P.TAXI) }
  for (const x of [5, 15]) {
    b.box(x, 3, 11, 3, 1, 3, P.WOOD).box(x + 1, 1, 12, 1, 2, 1, P.WOOD)
    b.box(x + 1, 4, 12, 2, 1, 1, P.STEEL)
  }
  figure(b, 5, 1, 15, { shirt: P.BLUE, hair: P.INK }, { seated: true })
  figure(b, 15, 1, 15, { shirt: P.TEAL, skin: P.SKIN2, hair: P.WOOD }, { seated: true })
  b.box(19, 1, 14, 2, 2, 2, P.WOOD).hball(20, 4, 15, 1, P.LEAF)
  // the person with a project, on the pavement: a table, a laptop, papers and a bulb
  b.box(8, 3, 22, 9, 1, 5, P.WOOD).box(8, 1, 22, 1, 2, 1, P.WOOD).box(16, 1, 22, 1, 2, 1, P.WOOD).box(8, 1, 26, 1, 2, 1, P.WOOD).box(16, 1, 26, 1, 2, 1, P.WOOD)
  b.box(10, 4, 23, 4, 1, 3, P.STEEL).box(10, 5, 23, 4, 3, 1, P.INK).set(11, 6, 23, P.GLASS)
  b.box(14, 4, 25, 2, 1, 2, P.WHITE).box(15, 4, 23, 1, 1, 1, P.WHITE)
  figure(b, 11, 1, 28, { shirt: P.TEAL, pants: P.DENIM, hair: P.HAIR }, { seated: true })
  b.hball(12, 11, 28, 2, P.TAXI) // the idea, a bulb above their head
  b.box(3, 1, 23, 2, 3, 2, P.WOOD).hball(4, 5, 24, 1, P.LEAF)
  bladeSign(b, CUP, 20, P.PINK)
  // a giant cup on the roof
  const cx = 12
  const y = H + 2
  b.cyl(cx, y, 9, 4, 6, P.WHITE).cyl(cx, y + 6, 9, 3, 1, P.WOOD)
  b.box(cx + 4, y + 2, 9, 3, 1, 1, P.WHITE).box(cx + 6, y + 2, 9, 1, 3, 1, P.WHITE).box(cx + 4, y + 4, 9, 3, 1, 1, P.WHITE)
  for (const x of [-1, 1]) for (let k = 0; k < 4; k++) b.set(cx + x, y + 8 + k, 9 + (k % 2), P.WHITE)
  return b.done()
}
