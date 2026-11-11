// Walkers and cars. Walkers are one instanced mesh per body part, shared by everyone; cars are moving voxel models.
import { BoxGeometry, Color, Group, InstancedMesh, Matrix4, MeshLambertMaterial, Object3D, Vector3 } from 'three'
import { P } from './palette'

type Path = [number, number][]

interface Walker {
  path: Path
  len: number[] // cumulative length at each point
  s: number // distance walked
  speed: number
  dir: 1 | -1
  phase: number
  off: number // how far to the right of the route they walk, in units
  cur: number // the current sideways offset, which eases when they turn round
  wx: number
  wz: number
  shirt: number
  pants: number
  skin: number
  hair: number
}

const hash = (n: number) => {
  const h = Math.sin(n * 78.233) * 43758.5453
  return h - Math.floor(h)
}

// body parts in world units: [size x, y, z], [hip/shoulder pivot x, y], how far it swings
const LEG = { s: [0.55, 1.3, 0.55] as const, ox: 0.33, oy: 1.3 }
const ARM = { s: [0.42, 1.25, 0.42] as const, ox: 0.85, oy: 2.55 }
const TORSO = { s: [1.3, 1.35, 0.75], y: 1.3 + 0.675 }
const HEAD = { s: [0.75, 0.75, 0.75], y: 2.65 + 0.375 }
const HAIR = { s: [0.82, 0.32, 0.82], y: 3.4 + 0.1 }

const geo = new BoxGeometry(1, 1, 1)
const m4 = new Matrix4()
const base = new Matrix4()
const part = new Matrix4()
const rx = new Matrix4()
const tr = new Matrix4()
const obj = new Object3D()

export function createWalkers(pal: Color[], paths: Path[], assign: number[], seed = 1) {
  const walkers: Walker[] = assign.map((pi, n) => {
    const path = paths[pi]
    const len = [0]
    for (let i = 1; i < path.length; i++) len.push(len[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]))
    const total = len[len.length - 1]
    return {
      path, len,
      s: hash(seed + n * 3.1) * total,
      speed: 1.5 + hash(seed + n * 7.7) * 1.6,
      dir: hash(seed + n * 1.3) > 0.5 ? 1 : -1,
      phase: hash(seed + n * 5.3) * 6.28,
      off: 0.45 + hash(seed + n * 9.1) * 0.2,
      cur: 0,
      wx: 0,
      wz: 0,
      shirt: [P.SHIRT1, P.SHIRT2, P.SHIRT3, P.SHIRT4, P.WHITE, P.BLUE, P.TEAL, P.RED][Math.floor(hash(seed + n * 2.2) * 8)],
      pants: [P.DENIM, P.INK, P.SLATE, P.CREAM, P.DENIM][Math.floor(hash(seed + n * 4.4) * 5)],
      skin: [P.SKIN1, P.SKIN2, P.SKIN3, P.SKIN1][Math.floor(hash(seed + n * 6.6) * 4)],
      hair: [P.HAIR, P.HAIR, P.INK, P.WOOD, P.TAXI][Math.floor(hash(seed + n * 8.8) * 5)],
    }
  })
  const N = walkers.length
  const mk = (colour: (w: Walker) => number) => {
    const m = new InstancedMesh(geo, new MeshLambertMaterial(), N)
    walkers.forEach((w, i) => m.setColorAt(i, pal[colour(w) - 1]))
    m.frustumCulled = false
    return m
  }
  const legL = mk((w) => w.pants), legR = mk((w) => w.pants), armL = mk((w) => w.shirt), armR = mk((w) => w.shirt)
  const torso = mk((w) => w.shirt), head = mk((w) => w.skin), hair = mk((w) => w.hair)
  const group = new Group()
  group.add(legL, legR, armL, armR, torso, head, hair)

  const put = (mesh: InstancedMesh, i: number, s: readonly number[], ox: number, oy: number, oz: number, swing: number, pivotDown: number) => {
    // translate to the pivot, swing about x, then hang the part below the pivot
    tr.makeTranslation(ox, oy, oz)
    rx.makeRotationX(swing)
    part.copy(base).multiply(tr).multiply(rx)
    tr.makeTranslation(0, -pivotDown, 0)
    part.multiply(tr)
    m4.makeScale(s[0], s[1], s[2])
    part.multiply(m4)
    mesh.setMatrixAt(i, part)
  }
  const fixed = (mesh: InstancedMesh, i: number, s: readonly number[], y: number) => {
    tr.makeTranslation(0, y, 0)
    part.copy(base).multiply(tr)
    m4.makeScale(s[0], s[1], s[2])
    part.multiply(m4)
    mesh.setMatrixAt(i, part)
  }
  const pos = new Vector3()

  /** Move everyone. With dt = 0 they are only posed (used for reduced motion). */
  function update(t: number, dt: number) {
    walkers.forEach((w, i) => {
      const total = w.len[w.len.length - 1]
      w.s += w.dir * w.speed * dt
      if (w.s > total) { w.s = total; w.dir = -1 }
      if (w.s < 0) { w.s = 0; w.dir = 1 }
      let k = 1
      while (k < w.len.length - 1 && w.len[k] < w.s) k++
      const [x0, z0] = w.path[k - 1]
      const [x1, z1] = w.path[k]
      const f = (w.s - w.len[k - 1]) / Math.max(1e-6, w.len[k] - w.len[k - 1])
      let dx = x1 - x0, dz = z1 - z0
      const l = Math.hypot(dx, dz) || 1
      dx /= l; dz /= l
      // keep to the right-hand side of the route, so people walking opposite ways do not overlap
      const want = w.off * w.dir
      w.cur = dt === 0 ? want : w.cur + (want - w.cur) * Math.min(1, dt * 3)
      w.wx = x0 + dx * l * f - dz * w.cur
      w.wz = z0 + dz * l * f + dx * w.cur
      pos.set(w.wx, 0, w.wz)
      const yaw = Math.atan2(dx * w.dir, dz * w.dir)
      obj.position.copy(pos)
      obj.rotation.set(0, yaw, 0)
      obj.updateMatrix()
      base.copy(obj.matrix)
      const sw = dt === 0 && t === 0 ? 0.35 * (i % 2 ? 1 : -1) : Math.sin(t * w.speed * 3.2 + w.phase) * 0.7
      const bob = Math.abs(Math.sin(t * w.speed * 3.2 + w.phase)) * 0.06
      base.multiply(tr.makeTranslation(0, bob, 0))
      put(legL, i, LEG.s, -LEG.ox, LEG.oy, 0, sw, LEG.s[1] / 2)
      put(legR, i, LEG.s, LEG.ox, LEG.oy, 0, -sw, LEG.s[1] / 2)
      put(armL, i, ARM.s, -ARM.ox, ARM.oy, 0, -sw, ARM.s[1] / 2 - 0.1)
      put(armR, i, ARM.s, ARM.ox, ARM.oy, 0, sw, ARM.s[1] / 2 - 0.1)
      fixed(torso, i, TORSO.s, TORSO.y)
      fixed(head, i, HEAD.s, HEAD.y)
      fixed(hair, i, HAIR.s, HAIR.y)
    })
    for (const m of [legL, legR, armL, armR, torso, head, hair]) m.instanceMatrix.needsUpdate = true
    if (legL.instanceColor) for (const m of [legL, legR, armL, armR, torso, head, hair]) m.instanceColor!.needsUpdate = true
  }
  update(0, 0)
  /** True if anyone is inside the box. */
  const anyIn = (x0: number, x1: number, z0: number, z1: number) => walkers.some((w) => w.wx > x0 && w.wx < x1 && w.wz > z0 && w.wz < z1)
  return { group, update, anyIn }
}

export interface Driver {
  mesh: Object3D
  axis: 'z'
  dir: 1 | -1
  speed: number
  min: number
  max: number
  lane: number
  v?: number // current speed
  stopped?: boolean
}

const HALF_CAR = 2.75
/** Cars loop down the avenue. They wait for people on a zebra and for the car ahead. */
export function updateDrivers(drivers: Driver[], dt: number, zebras: { rect: { z: number; d: number }; busy: boolean }[]) {
  for (const d of drivers) {
    const z = d.mesh.position.z
    d.stopped = false
    for (const zb of zebras) {
      if (!zb.busy) continue
      const edge = d.dir === 1 ? zb.rect.z - zb.rect.d / 2 : zb.rect.z + zb.rect.d / 2
      const gap = (edge - (z + d.dir * HALF_CAR)) * d.dir
      if (gap > -0.2 && gap < 2.5) d.stopped = true
    }
  }
  for (let pass = 0; pass < 3; pass++)
    for (const d of drivers) {
      if (d.stopped) continue
      for (const o of drivers) {
        if (o === d || o.lane !== d.lane || !o.stopped) continue
        const gap = (o.mesh.position.z - d.mesh.position.z) * d.dir - 2 * HALF_CAR
        if (gap > -0.2 && gap < 2.5) d.stopped = true
      }
    }
  for (const d of drivers) {
    d.v = (d.v ?? d.speed) + ((d.stopped ? 0 : d.speed) - (d.v ?? d.speed)) * Math.min(1, dt * 4)
    let n = d.mesh.position.z + d.dir * d.v * dt
    if (n > d.max) n = d.min
    if (n < d.min) n = d.max
    d.mesh.position.z = n
  }
}
