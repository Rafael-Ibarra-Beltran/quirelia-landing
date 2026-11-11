// Where everything stands in the Tijuana map, in world units (x east, z south). Pure data: no three.js, so a test can check it.
// world.ts places every object from here, and the walkers' routes are checked against the footprints below.

export const TOWN_W = 120
export const TOWN_D = 80

export interface Rect { x: number; z: number; w: number; d: number } // centre and size along x and z
export interface Circle { x: number; z: number; r: number }

export const WEST_X = -20
export const EAST_X = 20
const BODY_W = 12 // building width along the avenue
const BODY_D = 10 // building depth

export interface BuildingSlot { side: 'west' | 'east'; z: number; reach: number } // reach: how far the front spills onto the pavement
export const PLACES = ['restaurante', 'gimnasio', 'tienda', 'cafe'] as const

// The four places of the list stand on the west row, whose fronts face the camera.
export const WEST_ROW: (BuildingSlot & { id?: (typeof PLACES)[number] })[] = [
  { side: 'west', z: -22, reach: 3.5, id: 'tienda' },
  { side: 'west', z: -10, reach: 3.5, id: 'restaurante' },
  { side: 'west', z: 2, reach: 2.5 },
  { side: 'west', z: 22, reach: 3, id: 'gimnasio' },
  { side: 'west', z: 34, reach: 3.5, id: 'cafe' },
]
export const EAST_ROW: BuildingSlot[] = [-22, -10, 2, 22, 34].map((z) => ({ side: 'east', z, reach: 2.5 }))

/** x, z of each focusable place, in the order of PLACES. */
export const TIJUANA_SLOTS: [number, number][] = PLACES.map((id) => [WEST_X, WEST_ROW.find((b) => b.id === id)!.z])

export const TREES: [number, number][] = [[6.9, -26], [6.9, -18], [6.9, -10], [6.9, -2], [6.9, 26], [6.9, 34], [-6.9, 2]]
export const LAMPS: [number, number][] = [[7.9, -30], [7.9, -14], [7.9, 0], [7.9, 21], [7.9, 30]]
export const STALLS: { x: number; z: number; rot: number }[] = [{ x: 7.4, z: -6, rot: -Math.PI / 2 }]
export const PLAZA_STALL = { x: 31, z: 11.5, rot: 0 }
export const UMBRELLAS: [number, number][] = [[-38, -6], [-41, 0], [-36, -12], [-37, 9], [-42, -16]]
export const PALMS: [number, number][] = [[-26, -14], [-26, 6], [-26, 30], [30, 1], [59, 3], [59, 30], [33, 30], [-30, 39.5]]

export const BOLA = { x: 44, z: -16 }
export const GARITA = { x: 40, z: -33 }
export const MONUMENT = { x: 46, z: 16 }
export const BULLRING = { x: -37, z: 22, r: 11.5 }
export const LETTERS = { x: 44, z: 29.5 }
export const ZONKEY = { x: 36, z: 24 }
export const ARCO = { x: 0, z: -30 }

/** Footprints that people cannot walk through. */
export function obstacles(): { rects: Rect[]; circles: Circle[] } {
  const rects: Rect[] = []
  const circles: Circle[] = []
  for (const b of [...WEST_ROW, ...EAST_ROW]) {
    const cx = b.side === 'west' ? WEST_X + b.reach / 2 : EAST_X - b.reach / 2
    rects.push({ x: cx, z: b.z, w: BODY_D + b.reach, d: BODY_W })
  }
  for (const [x, z] of TREES) circles.push({ x, z, r: 0.8 })
  for (const [x, z] of LAMPS) circles.push({ x, z, r: 0.5 })
  for (const s of STALLS) rects.push({ x: s.x, z: s.z, w: 2.4, d: 4.4 })
  rects.push({ x: PLAZA_STALL.x, z: PLAZA_STALL.z, w: 4.4, d: 2.4 })
  for (const [x, z] of UMBRELLAS) circles.push({ x, z, r: 2.6 })
  for (const [x, z] of PALMS) circles.push({ x, z, r: 0.7 })
  rects.push({ x: BOLA.x, z: BOLA.z + 4, w: 31, d: 25 })
  rects.push({ x: GARITA.x, z: GARITA.z, w: 32, d: 10 })
  circles.push({ x: MONUMENT.x, z: MONUMENT.z, r: 7 })
  circles.push({ x: BULLRING.x, z: BULLRING.z, r: BULLRING.r })
  rects.push({ x: LETTERS.x, z: LETTERS.z, w: 28, d: 3 })
  rects.push({ x: ZONKEY.x, z: ZONKEY.z, w: 11, d: 2.4 })
  rects.push({ x: 0, z: -37.5, w: TOWN_W, d: 2 }) // the border wall
  rects.push({ x: -8, z: ARCO.z, w: 1.4, d: 2 }, { x: 8, z: ARCO.z, w: 1.4, d: 2 }) // the feet of the Arco
  return { rects, circles }
}

export type Path = [number, number][]
/** Walkers' routes. Pavement lanes at x = ±10.2, between the street trees and the terraces; crossings only on the zebras. */
export const PATHS: Path[] = [
  [[-10.2, -34], [-10.2, 38]], // west pavement
  [[10.2, -34], [10.2, 38]], // east pavement
  [[-10.2, 5.5], [10.2, 5.5]], // crossing the avenue, north
  [[10.2, 18.5], [-10.2, 18.5]], // crossing the avenue, south
  [[34, 6], [57, 6], [57, 26.5], [34, 26.5]], // the plaza
  [[-31.5, -33], [-31.5, 7]], // the beach
  [[-44, 36], [-28, 36]],
]
/** How many walkers on each route. */
export const WALKERS = [4, 4, 2, 2, 6, 3, 2]
/** The half width of the paths' lateral room: the right-hand offset plus a little random. */
export const LATERAL = 0.7
export const WALKER_RADIUS = 0.6

// Cars drive down the avenue at x = ±3 and stop for people on these zebras.
export const ZEBRAS: Rect[] = [{ x: 0, z: 5.5, w: 12, d: 2.4 }, { x: 0, z: 18.5, w: 12, d: 2.4 }]
