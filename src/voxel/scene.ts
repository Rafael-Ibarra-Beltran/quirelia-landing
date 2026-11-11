import { Vector3, AmbientLight, BoxGeometry, Color, DirectionalLight, Group, InstancedMesh, MeshLambertMaterial, Object3D, OrthographicCamera, Scene, WebGLRenderer } from 'three'
import { bounds, STACK, type Model } from './models'
import { TOWN_COLORS } from './town/palette'
import { TOWN_D, TOWN_H, TOWN_W } from './town/world'

/** Reads the --vox-1..9 colour tokens. */
export function readVoxPalette(el: Element): Color[] {
  const cs = getComputedStyle(el)
  return Array.from({ length: 9 }, (_, i) => new Color(cs.getPropertyValue(`--vox-${i + 1}`).trim() || '#888888'))
}

const geo = new BoxGeometry(1, 1, 1)

export interface MeshOpts {
  origin?: [number, number] // model x, z that becomes the mesh centre (default: the centre of its footprint)
  jitter?: number // deterministic lightness variation per voxel, 0..0.1
  ao?: number // darken voxels in the lowest two layers, 0..1
}
const hash3 = (x: number, y: number, z: number) => {
  const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453
  return h - Math.floor(h)
}

/** One model as a single instanced mesh, centred on its footprint and sitting on y = 0. */
export function modelMesh(model: Model, pal: Color[], scale = 1, opts: MeshOpts = {}): InstancedMesh {
  const mat = new MeshLambertMaterial()
  const mesh = new InstancedMesh(geo, mat, model.length)
  const { lo, size } = bounds(model)
  const ox = opts.origin ? opts.origin[0] - lo[0] : size[0] / 2
  const oz = opts.origin ? opts.origin[1] - lo[2] : size[2] / 2
  const o = new Object3D()
  const groups: Record<string, number[]> = {}
  const pos: [number, number, number][] = []
  const col = new Color()
  model.forEach((v, i) => {
    const p: [number, number, number] = [v.x - lo[0] - ox + 0.5, v.y - lo[1] + 0.5, v.z - lo[2] - oz + 0.5]
    o.position.set(...p)
    o.updateMatrix()
    mesh.setMatrixAt(i, o.matrix)
    col.copy(pal[v.c - 1] ?? pal[7])
    if (opts.jitter) col.offsetHSL(0, 0, (hash3(v.x, v.y, v.z) - 0.5) * 2 * opts.jitter)
    if (opts.ao && v.y - lo[1] < 2) col.multiplyScalar(1 - opts.ao * (v.y - lo[1] < 1 ? 1 : 0.5))
    mesh.setColorAt(i, col)
    pos.push(p)
    if (v.g) (groups[v.g] ??= []).push(i)
  })
  mesh.userData.groups = groups
  mesh.userData.model = model
  mesh.userData.pos = pos
  mesh.scale.setScalar(scale)
  mesh.instanceMatrix.needsUpdate = true
  return mesh
}

const tmp = new Object3D()
/** Move a group of instances up or down from where they were built. */
export function lift(mesh: InstancedMesh, idx: number[], dy: number) {
  const pos = mesh.userData.pos as [number, number, number][]
  for (const i of idx) {
    tmp.position.set(pos[i][0], pos[i][1] + dy, pos[i][2])
    tmp.updateMatrix()
    mesh.setMatrixAt(i, tmp.matrix)
  }
  mesh.instanceMatrix.needsUpdate = true
}
export function paint(mesh: InstancedMesh, i: number, color: Color) {
  mesh.setColorAt(i, color)
}

export function lights(scene: Scene) {
  scene.add(new AmbientLight(0xffffff, 1.5))
  const sun = new DirectionalLight(0xffffff, 2.2)
  sun.position.set(-8, 16, 10)
  scene.add(sun)
}

/** Isometric camera that frames a box of the given half extents. */
export function isoCamera(aspect: number, half: number) {
  const cam = new OrthographicCamera(-half * aspect, half * aspect, half, -half, 0.1, 400)
  cam.position.set(40, 34, 40)
  cam.lookAt(0, 0, 0)
  return cam
}

/** Front-facing camera for a standing object about 18 voxels tall. */
export function frontCamera(aspect: number, half: number) {
  const cam = new OrthographicCamera(-half * aspect, half * aspect, half, -half, 0.1, 400)
  cam.position.set(5, 6, 40)
  cam.lookAt(0, 0, 0)
  return cam
}

export function makeRenderer(canvas: HTMLCanvasElement, alpha = true) {
  const r = new WebGLRenderer({ canvas, antialias: true, alpha, preserveDrawingBuffer: !alpha ? false : true })
  r.setClearColor(0x000000, 0)
  return r
}

/** Renders one model to a transparent square image on a canvas (used for the Soluciones icons). */
export function renderIcon(canvas: HTMLCanvasElement, model: Model, pal: Color[], size = 320) {
  canvas.width = canvas.height = size
  const r = makeRenderer(canvas)
  r.setSize(size, size, false)
  const scene = new Scene()
  lights(scene)
  const m = modelMesh(model, pal)
  const { size: s } = bounds(model)
  m.position.y = -s[1] / 2
  m.rotation.y = 0.45
  scene.add(m)
  const reach = Math.max(s[0], s[1], s[2]) * 0.72
  const cam = isoCamera(1, reach)
  r.render(scene, cam)
  r.dispose()
}

const SLOTS: [number, number][] = [[-15, -11], [15, -11], [-15, 11], [15, 11]]

function platform(w: number, d: number): Model {
  const v: Model = []
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) v.push({ x, y: 0, z, c: x === 0 || z === 0 || x === w - 1 || z === d - 1 ? 3 : (x + z) % 2 ? 1 : 2 })
  return v
}

/** The stack island: a platform and one structure per group. Shared by the page and the exporter. */
export function buildDiorama(pal: Color[]) {
  const world = new Group()
  const base = modelMesh(platform(58, 44), pal)
  base.position.y = -1
  world.add(base)
  const meshes = STACK.map((make, i) => {
    const m = modelMesh(make(), pal, 0.85)
    m.position.set(SLOTS[i][0], 0, SLOTS[i][1])
    m.userData.i = i
    world.add(m)
    return m
  })
  world.rotation.y = 0.5
  return { world, meshes }
}

/** Real-world colours of the Tijuana map, from --town-1..42. */
export function readTownPalette(el: Element): Color[] {
  const cs = getComputedStyle(el)
  return Array.from({ length: TOWN_COLORS }, (_, i) => new Color(cs.getPropertyValue(`--town-${i + 1}`).trim() || '#888888'))
}

/** A cool ambient light and a warm sun that casts shadows, so natural colours keep their volume. */
export function townLights(scene: Scene) {
  scene.add(new AmbientLight(0xeef4ff, 0.95))
  const sun = new DirectionalLight(0xfff0d6, 2.9)
  sun.position.set(60, 85, 35)
  sun.castShadow = true
  sun.shadow.mapSize.set(4096, 4096)
  Object.assign(sun.shadow.camera, { left: -85, right: 85, top: 85, bottom: -85, near: 1, far: 260 })
  sun.shadow.bias = -0.0006
  sun.shadow.normalBias = 0.25
  scene.add(sun)
}

/** Frame the whole town in an iso view: the half height of the frustum and the look-at point that centre it, with a margin. */
export function frameTown(world: Group, aspect: number) {
  const cam = isoCamera(aspect, 1)
  cam.updateMatrixWorld(true)
  const inv = cam.matrixWorldInverse
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9
  // the ground corners at ground level and wall height, plus the top of the Arco (the tallest thing)
  const pts = [-1, 1].flatMap((sx) => [-1, 1].flatMap((sz) => [-2, 14].map((y) => new Vector3((sx * TOWN_W) / 2, y, (sz * TOWN_D) / 2))))
  pts.push(new Vector3(0, TOWN_H - 2, -30))
  for (const q of pts) {
    const p = world.localToWorld(q).applyMatrix4(inv)
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y)
  }
  const half = Math.max((y1 - y0) / 2, (x1 - x0) / (2 * aspect)) * 1.04
  const right = new Vector3().setFromMatrixColumn(cam.matrixWorld, 0)
  const up = new Vector3().setFromMatrixColumn(cam.matrixWorld, 1)
  const center = right.multiplyScalar((x0 + x1) / 2).add(up.multiplyScalar((y0 + y1) / 2))
  return { half, center }
}

export { buildTijuana, TIJUANA_SLOTS, TOWN_D, TOWN_H, TOWN_W, type Town } from './town/world'

export { Group, Scene }
