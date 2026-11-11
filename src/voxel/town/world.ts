// The Tijuana map: Avenida Revolucion down the middle, the CECUT plaza to the east, the beach and the bullring to the west,
// the border wall at the north. 1 world unit = 2 voxels. x east, z south (towards the camera).
import { BoxGeometry, CanvasTexture, Color, DoubleSide, Group, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, MeshLambertMaterial, PlaneGeometry, RingGeometry, SRGBColorSpace, Vector3 } from 'three'
import type { Model } from '../models'
import { modelMesh } from '../scene'
import { bodyOrigin, building, cafe, gym, hotel, restaurant, shop, type BuildingOpts } from './buildings'
import { arco, bola, bullring, car, ficus, garita, lamp, letters, monument, palm, stall, umbrella, wall, zonkey } from './landmarks'
import { ARCO, BOLA, BULLRING, EAST_X, GARITA, LAMPS, LETTERS, MONUMENT, PALMS, PATHS, PLAZA_STALL, STALLS, TIJUANA_SLOTS, TOWN_D, TOWN_W, TREES, UMBRELLAS, WALKERS, WEST_X, ZEBRAS, ZONKEY, type Rect } from './layout'
import { createWalkers, updateDrivers, type Driver } from './people'
import { P } from './palette'

export { TIJUANA_SLOTS, TOWN_D, TOWN_W }
export const TOWN_H = 40
export const WORLD_YAW = 0

export interface Town {
  world: Group
  east: Group // the east row and its trees and lamps: they sink out of the way when a place is focused
  rings: Mesh[]
  target: (i: number) => Vector3
  update: (t: number, dt: number) => void
  done: Promise<void>
}

function groundTexture(pal: Color[]) {
  const ppu = 16
  const cv = document.createElement('canvas')
  cv.width = TOWN_W * ppu
  cv.height = TOWN_D * ppu
  const g = cv.getContext('2d')!
  const hex = (i: number) => '#' + pal[i - 1].getHexString()
  const X = (x: number) => (x + TOWN_W / 2) * ppu
  const Z = (z: number) => (z + TOWN_D / 2) * ppu
  const rect = (x0: number, z0: number, x1: number, z1: number, c: number | string) => {
    g.fillStyle = typeof c === 'number' ? hex(c) : c
    g.fillRect(X(x0), Z(z0), (x1 - x0) * ppu, (z1 - z0) * ppu)
  }
  const speckle = (x0: number, z0: number, x1: number, z1: number, c: number, n: number, seed: number) => {
    g.fillStyle = hex(c)
    for (let i = 0; i < n; i++) {
      const a = Math.sin(seed + i * 12.9898) * 43758.5453
      const b = Math.sin(seed + i * 78.233) * 12345.678
      const x = x0 + (a - Math.floor(a)) * (x1 - x0)
      const z = z0 + (b - Math.floor(b)) * (z1 - z0)
      g.fillRect(X(x), Z(z), ppu * 0.5, ppu * 0.5)
    }
  }
  const grid = (x0: number, z0: number, x1: number, z1: number, step: number, color: string, offset = false) => {
    g.strokeStyle = color
    g.lineWidth = 1
    g.beginPath()
    for (let z = z0; z <= z1; z += step) { g.moveTo(X(x0), Z(z)); g.lineTo(X(x1), Z(z)) }
    let row = 0
    for (let z = z0; z < z1; z += step, row++) for (let x = x0 + (offset && row % 2 ? step / 2 : 0); x <= x1; x += step) { g.moveTo(X(x), Z(z)); g.lineTo(X(x), Z(z + step)) }
    g.stroke()
  }

  rect(-60, -40, 60, 40, P.GRASS)
  speckle(-60, -40, 60, 40, P.LEAF, 2600, 1)
  speckle(-60, -40, 60, 40, P.DIRT, 500, 2)
  // the beach and the sea
  rect(-47, -40, -27, 40, P.SAND)
  speckle(-47, -40, -27, 40, P.CREAM, 900, 3)
  speckle(-47, -40, -27, 40, P.DIRT, 300, 4)
  const sea = g.createLinearGradient(X(-60), 0, X(-47), 0)
  sea.addColorStop(0, hex(P.SEADEEP))
  sea.addColorStop(1, hex(P.SEA))
  rect(-60, -40, -47, 40, sea as unknown as string)
  for (let z = -40; z < 40; z += 0.5) {
    const x = -47 + Math.sin(z * 1.7) * 0.5
    g.fillStyle = hex(P.FOAM)
    g.fillRect(X(x - 0.6), Z(z), ppu * 1.2, ppu * 0.5)
  }
  for (let i = 0; i < 80; i++) rect(-58 + ((i * 7.3) % 10), -40 + ((i * 3.7) % 80), -58 + ((i * 7.3) % 10) + 1.8, -40 + ((i * 3.7) % 80) + 0.3, P.SEA)
  // lots behind the shopfronts
  rect(-27, -37, -15, 40, P.WALK)
  rect(15, -37, 27, 40, P.WALK)
  grid(-27, -37, -15, 40, 2, 'rgba(0,0,0,0.08)')
  grid(15, -37, 27, 40, 2, 'rgba(0,0,0,0.08)')
  // the avenue: cobbles, red curbs, sidewalks
  rect(-15, -40, 15, 40, P.WALK)
  grid(-15, -40, -6, 40, 1, 'rgba(0,0,0,0.10)', true)
  grid(6, -40, 15, 40, 1, 'rgba(0,0,0,0.10)', true)
  rect(-6, -40, 6, 40, P.ASPH)
  grid(-6, -40, 6, 40, 0.8, 'rgba(255,255,255,0.07)', true)
  rect(-6.5, -40, -6, 40, P.RED)
  rect(6, -40, 6.5, 40, P.RED)
  for (let z = -40; z < 40; z += 4) rect(-0.12, z, 0.12, z + 2, P.WHITE)
  // the cross street
  rect(-27, 8, 27, 16, P.ASPH)
  grid(-27, 8, 27, 16, 0.8, 'rgba(255,255,255,0.07)', true)
  rect(-27, 7.6, 27, 8, P.RED)
  rect(-27, 16, 27, 16.4, P.RED)
  rect(-6, 8, 6, 16, P.ASPH)
  for (let x = -26; x < 27; x += 4) rect(x, 11.9, x + 2, 12.1, P.WHITE)
  // zebra crossings
  for (let x = -5.5; x < 5.5; x += 1.6) { rect(x, 4.6, x + 0.9, 6.4, P.WHITE); rect(x, 17.6, x + 0.9, 19.4, P.WHITE) }
  for (let z = 8.6; z < 15.4; z += 1.6) { rect(-11.1, z, -9.3, z + 0.9, P.WHITE); rect(9.3, z, 11.1, z + 0.9, P.WHITE) }
  // the border: dirt road along the wall
  rect(-47, -40, 60, -36.5, P.DIRT)
  speckle(-47, -40, 60, -36.5, P.CONCRETE, 400, 5)
  // the CECUT plaza
  rect(27, -34, 60, 33, P.PLAZA)
  grid(27, -34, 60, 33, 2, 'rgba(120,70,40,0.16)')
  rect(27, 7.5, 60, 8, P.WALK)
  // the roundabout with the monument
  g.fillStyle = hex(P.ASPH)
  g.beginPath(); g.arc(X(MONUMENT.x), Z(MONUMENT.z), 10 * ppu, 0, 7); g.fill()
  g.fillStyle = hex(P.GRASS)
  g.beginPath(); g.arc(X(MONUMENT.x), Z(MONUMENT.z), 7 * ppu, 0, 7); g.fill()
  g.fillStyle = hex(P.WALK)
  g.beginPath(); g.arc(X(MONUMENT.x), Z(MONUMENT.z), 3.4 * ppu, 0, 7); g.fill()
  // the arena of the bullring
  g.fillStyle = hex(P.DIRT)
  g.beginPath(); g.arc(X(BULLRING.x), Z(BULLRING.z), 12 * ppu, 0, 7); g.fill()
  g.fillStyle = hex(P.SAND)
  g.beginPath(); g.arc(X(BULLRING.x), Z(BULLRING.z), 8 * ppu, 0, 7); g.fill()
  const tex = new CanvasTexture(cv)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 8
  tex.minFilter = LinearMipmapLinearFilter
  return tex
}

/** Builds the whole town in stages (so the page keeps scrolling); `done` resolves when everything is in. */
export function buildTijuana(pal: Color[]): Town {
  const world = new Group()
  const east = new Group()
  world.add(east)
  const rings: Mesh[] = []
  const drivers: Driver[] = []
  let walkers: ReturnType<typeof createWalkers> | null = null

  const put = (model: Model, x: number, z: number, o: { rot?: number; scale?: number; origin?: [number, number]; jitter?: number; ao?: number; into?: Group } = {}) => {
    const m = modelMesh(model, pal, o.scale ?? 0.5, { origin: o.origin, jitter: o.jitter ?? 0.03, ao: o.ao ?? 0.2 })
    m.castShadow = m.receiveShadow = true
    m.position.set(x, 0, z)
    m.rotation.y = o.rot ?? 0
    ;(o.into ?? world).add(m)
    return m
  }

  const gt = new Mesh(new PlaneGeometry(TOWN_W, TOWN_D), new MeshLambertMaterial({ map: groundTexture(pal) }))
  gt.rotation.x = -Math.PI / 2
  gt.position.y = 0.02
  gt.receiveShadow = true
  world.add(gt)
  const dirt = new Mesh(new BoxGeometry(TOWN_W, 2, TOWN_D), new MeshLambertMaterial({ color: pal[P.DIRT - 1] }))
  dirt.position.y = -1
  dirt.receiveShadow = true
  world.add(dirt)
  world.rotation.y = WORLD_YAW
  world.updateMatrixWorld(true)

  const WEST = Math.PI / 2 // fronts face +x, towards the avenue
  const EAST = -Math.PI / 2
  const row = (o: BuildingOpts, x: number, z: number, rot: number, into?: Group) => put(building(o), x, z, { rot, origin: bodyOrigin(o), jitter: 0.025, into })
  const full = (model: Model, z: number) => put(model, WEST_X, z, { rot: WEST, origin: bodyOrigin({}), jitter: 0.025 })

  const stages: (() => void)[] = [
    // the west row: the four places of the list, with their fronts facing the camera, and a hotel
    () => {
      const z = (id: number) => TIJUANA_SLOTS[id][1]
      full(restaurant(), z(0))
      full(gym(), z(1))
      full(shop(), z(2))
      full(cafe(), z(3))
      row(hotel(3), WEST_X, 2, WEST)
    },
    // the east row: backs towards the camera, with shopfronts facing the avenue
    () => {
      const eastOpts: BuildingOpts[] = [
        { floors: 2, wall: P.PINK, stripe: P.WHITE, sign: 'FARMA', signBg: P.TEAL, seed: 21, trim: P.WHITE, awning: [P.TEAL, P.WHITE] },
        { floors: 2, wall: P.TEAL, stripe: P.CREAM, sign: 'BAR', signBg: P.RED, seed: 22, trim: P.CREAM, awning: [P.RED, P.CREAM] },
        { ...hotel(23), floors: 3 },
        { floors: 2, wall: P.ORANGE, stripe: P.BLUE, sign: 'BANCO', signBg: P.BLUE, seed: 24, trim: P.WHITE, awning: [P.BLUE, P.WHITE] },
        { floors: 2, wall: P.MUSTARD, stripe: P.RED, sign: 'TIENDA', signBg: P.RED, seed: 25, trim: P.WHITE },
      ]
      ;[-22, -10, 2, 22, 34].forEach((z, i) => row({ ...eastOpts[i], back: true }, EAST_X, z, EAST, east))
    },
    () => {
      put(arco(), ARCO.x, ARCO.z, { origin: [0, 1], jitter: 0.02 })
      put(bola(), BOLA.x, BOLA.z, { scale: 0.25, origin: [0, 0], jitter: 0.02, ao: 0 })
      put(wall(236, [[26, 38], [104, 44], [176, 36]]), 0, -38, { origin: [118, 2], jitter: 0.04 })
      put(garita(), GARITA.x, GARITA.z, { origin: [32, 10], jitter: 0.02 })
    },
    () => {
      put(bullring(), BULLRING.x, BULLRING.z, { origin: [0, 0], jitter: 0.03 })
      put(monument(), MONUMENT.x, MONUMENT.z, { origin: [0, 0], jitter: 0.02 })
      put(letters('TIJUANA'), LETTERS.x, LETTERS.z, { origin: [27, 2], jitter: 0.02 })
      put(zonkey(), ZONKEY.x, ZONKEY.z, { scale: 0.35, origin: [0, 1] })
    },
    () => {
      for (const [x, z] of TREES) put(ficus(), x, z, { origin: [1, 1], jitter: 0.04, into: x > 0 ? east : world })
      for (const [x, z] of LAMPS) put(lamp(), x, z, { rot: x < 0 ? Math.PI / 2 : -Math.PI / 2, origin: [0, 0], into: x > 0 ? east : world })
      for (const [x, z] of PALMS) put(palm(), x, z, { origin: [0, 1], jitter: 0.04 })
      for (const s of STALLS) put(stall(P.RED, P.WHITE), s.x, s.z, { rot: s.rot, origin: [4, 2], into: s.x > 0 ? east : world })
      put(stall(P.PINK, P.WHITE), PLAZA_STALL.x, PLAZA_STALL.z, { rot: PLAZA_STALL.rot, origin: [4, 2] })
      const um = [[P.RED, P.WHITE], [P.TAXI, P.WHITE], [P.BLUE, P.WHITE], [P.TEAL, P.WHITE], [P.PINK, P.WHITE]]
      UMBRELLAS.forEach(([x, z], i) => put(umbrella(um[i][0], um[i][1]), x, z, { origin: [0, 0] }))
    },
    () => {
      const colors = [P.TAXI, P.ORANGE, P.TAXI, P.WHITE, P.TAXI, P.BLUE]
      const lanes: [number, 1 | -1, number][] = [[-3, 1, -34], [-3, 1, 4], [-3, 1, 30], [3, -1, -20], [3, -1, 16], [3, -1, 36]]
      lanes.forEach(([lane, dir, start], i) => {
        const m = put(car(colors[i]), lane, start, { rot: dir === 1 ? 0 : Math.PI, origin: [2.5, 5.5], jitter: 0.02, ao: 0 })
        m.castShadow = false
        drivers.push({ mesh: m, axis: 'z', dir, speed: 3 + (i % 3) * 0.8, min: -38, max: 38, lane })
      })
    },
    () => {
      const assign = WALKERS.flatMap((n, i) => Array<number>(n).fill(i))
      walkers = createWalkers(pal, PATHS, assign, 7)
      world.add(walkers.group)
    },
  ]

  const done = (async () => {
    for (const s of stages) {
      await new Promise<void>((r) => setTimeout(r, 0))
      s()
    }
  })()

  // a ring on the ground around each place, in front of the building
  TIJUANA_SLOTS.forEach(([x, z]) => {
    const r = new Mesh(new RingGeometry(9, 10.6, 64), new MeshBasicMaterial({ color: pal[P.RING - 1], transparent: true, opacity: 0, depthWrite: false, side: DoubleSide }))
    r.rotation.x = -Math.PI / 2
    r.renderOrder = 10
    r.position.set(x + 3, 0.12, z)
    world.add(r)
    rings.push(r)
  })
  world.updateMatrixWorld(true)
  const target = (i: number) => world.localToWorld(new Vector3(TIJUANA_SLOTS[i][0] + 4, 8, TIJUANA_SLOTS[i][1]))
  const inZebra = (r: Rect) => walkers?.anyIn(r.x - r.w / 2, r.x + r.w / 2, r.z - r.d / 2, r.z + r.d / 2) ?? false
  const update = (t: number, dt: number) => {
    walkers?.update(t, dt)
    updateDrivers(drivers, dt, ZEBRAS.map((z) => ({ rect: z, busy: inZebra(z) })))
  }
  return { world, east, rings, target, update, done }
}
