// Procedural voxel models. Units are voxels, y is up. `c` indexes the --vox-N colour tokens (1..9).
export interface Voxel {
  x: number
  y: number
  z: number
  c: number
  g?: string // animation group
  s?: number // position along a line, 0..1
}
export type Model = Voxel[]

// colour slots: 1 deep blue, 2 blue, 3 light blue, 4 pale, 5 ivory, 6 ink, 7 coral (tiny accents only), 8 slate, 9 glass
export class Builder {
  private map = new Map<string, Voxel>()
  set(x: number, y: number, z: number, c: number, g?: string, s?: number) {
    x = Math.round(x)
    y = Math.round(y)
    z = Math.round(z)
    this.map.set(`${x},${y},${z}`, { x, y, z, c, g, s })
    return this
  }
  box(x: number, y: number, z: number, w: number, h: number, d: number, c: number, g?: string) {
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) for (let k = 0; k < d; k++) this.set(x + i, y + j, z + k, c, g)
    return this
  }
  cyl(cx: number, y: number, cz: number, r: number, h: number, c: number, g?: string) {
    for (let i = -r; i <= r; i++) for (let k = -r; k <= r; k++) if (i * i + k * k <= r * r + 0.5) for (let j = 0; j < h; j++) this.set(cx + i, y + j, cz + k, c, g)
    return this
  }
  ball(cx: number, cy: number, cz: number, r: number, c: number, g?: string) {
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++) if (i * i + j * j + k * k <= r * r + 0.5) this.set(cx + i, cy + j, cz + k, c, g)
    return this
  }
  line(a: [number, number, number], b: [number, number, number], c: number, g?: string) {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), 1)
    for (let i = 0; i <= n; i++) this.set(a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n, a[2] + ((b[2] - a[2]) * i) / n, c, g, i / n)
    return this
  }
  /** Only the surface of a box: no hidden voxels inside. */
  shell(x: number, y: number, z: number, w: number, h: number, d: number, c: number, g?: string) {
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) for (let k = 0; k < d; k++) if (i === 0 || j === 0 || k === 0 || i === w - 1 || j === h - 1 || k === d - 1) this.set(x + i, y + j, z + k, c, g)
    return this
  }
  /** Only the four vertical sides of a box, open on top and bottom. */
  walls(x: number, y: number, z: number, w: number, h: number, d: number, c: number, g?: string) {
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) for (let k = 0; k < d; k++) if (i === 0 || k === 0 || i === w - 1 || k === d - 1) this.set(x + i, y + j, z + k, c, g)
    return this
  }
  /** A hollow sphere. */
  hball(cx: number, cy: number, cz: number, r: number, c: number, g?: string) {
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++) {
      const d = i * i + j * j + k * k
      if (d <= r * r + 0.5 && d > (r - 1.4) * (r - 1.4)) this.set(cx + i, cy + j, cz + k, c, g)
    }
    return this
  }
  del(x: number, y: number, z: number, w: number, h: number, d: number) {
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) for (let k = 0; k < d; k++) this.map.delete(`${Math.round(x + i)},${Math.round(y + j)},${Math.round(z + k)}`)
    return this
  }
  has(x: number, y: number, z: number) {
    return this.map.has(`${Math.round(x)},${Math.round(y)},${Math.round(z)}`)
  }
  done(): Model {
    return [...this.map.values()]
  }
}

/** Browser window on a small stand. */
export function web(): Model {
  const b = new Builder()
  b.box(0, 3, 0, 18, 12, 2, 5) // frame
  b.box(0, 14, 0, 18, 1, 2, 1) // title bar
  b.set(2, 14, 2, 7, 'dot', 0).set(4, 14, 2, 3, 'dot', 1).set(6, 14, 2, 4, 'dot', 2)
  b.box(2, 7, 2, 7, 5, 1, 3) // picture
  b.box(3, 9, 3, 2, 2, 1, 5) // sun
  b.box(11, 11, 2, 5, 1, 1, 8).box(11, 9, 2, 5, 1, 1, 8).box(11, 7, 2, 4, 1, 1, 8)
  for (let i = 0; i < 14; i++) b.set(2 + i, 4, 2, 4, 'bar', i / 14)
  b.box(8, 1, 0, 2, 2, 2, 8).box(5, 0, 0, 8, 1, 2, 8)
  return b.done()
}

/** Three database discs and a status light each. */
export function data(): Model {
  const b = new Builder()
  for (let i = 0; i < 3; i++) {
    const y = i * 5
    const g = `d${i}`
    b.cyl(0, y, 0, 6, 4, i === 1 ? 3 : 2, g)
    b.cyl(0, y + 4, 0, 6, 1, 4, g)
    b.set(0, y + 1, 6, i === 0 ? 7 : 4, g).set(1, y + 1, 6, 4, g).set(-1, y + 1, 6, 4, g)
    b.box(-3, y + 2, 6, 7, 1, 1, 1, g)
  }
  return b.done()
}

/** A small neural network: three layers of cubes joined by thin lines. */
export function ai(): Model {
  const b = new Builder()
  const layers: [number, number][][] = [
    [[0, 3], [0, 11]],
    [[9, 0], [9, 7], [9, 14]],
    [[18, 3], [18, 11]],
  ]
  for (let l = 0; l < layers.length - 1; l++)
    for (const [x1, y1] of layers[l]) for (const [x2, y2] of layers[l + 1]) b.line([x1 + 2, y1 + 1, 1], [x2, y2 + 1, 1], 8, `l${l}`)
  layers.forEach((layer, l) => layer.forEach(([x, y], i) => b.box(x, y, 0, 3, 3, 3, l === 2 ? (i === 0 ? 7 : 3) : l === 0 ? 2 : 4, `n${l}`)))
  b.box(-2, 6, 0, 1, 3, 1, 8).box(21, 6, 0, 1, 3, 1, 8)
  return b.done()
}

/** A phone with a lens beside it (mobile and computer vision). */
export function vision(): Model {
  const b = new Builder()
  b.box(0, 0, 0, 9, 16, 2, 6)
  b.box(1, 2, 2, 7, 12, 1, 4)
  b.box(2, 11, 2, 2, 2, 1, 3, 'app0').box(5, 11, 2, 2, 2, 1, 2, 'app1').box(2, 8, 2, 2, 2, 1, 2, 'app2').box(5, 8, 2, 2, 2, 1, 3, 'app3')
  b.box(3, 0, 2, 3, 1, 1, 8)
  b.ball(15, 8, 1, 4, 5)
  b.ball(15, 8, 3, 3, 3)
  b.ball(15, 8, 4, 2, 6)
  b.set(14, 9, 6, 5)
  return b.done()
}

export function calendar(): Model {
  const b = new Builder()
  b.box(0, 0, 0, 16, 14, 3, 5)
  b.box(0, 11, 0, 16, 3, 3, 1)
  b.box(3, 14, 1, 2, 3, 1, 6).box(11, 14, 1, 2, 3, 1, 6)
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) b.box(2 + c * 3, 1 + r * 3, 3, 2, 2, 1, r === 1 && c === 2 ? 2 : 4)
  b.set(8, 4, 4, 5).set(9, 5, 4, 5).set(10, 4, 4, 5)
  return b.done()
}

export function chat(): Model {
  const b = new Builder()
  b.box(1, 3, 0, 16, 10, 3, 3)
  b.box(0, 4, 0, 18, 8, 3, 3).box(2, 2, 0, 14, 12, 3, 3)
  b.box(3, 0, 0, 3, 3, 3, 3).box(2, 1, 0, 2, 2, 3, 3)
  b.box(4, 7, 3, 2, 2, 1, 6).box(8, 7, 3, 2, 2, 1, 6).box(12, 7, 3, 2, 2, 1, 6)
  b.box(14, 12, 3, 3, 3, 1, 7)
  return b.done()
}

export function robot(): Model {
  const b = new Builder()
  b.box(0, 0, 0, 14, 11, 10, 3)
  b.box(1, 1, 10, 12, 9, 1, 2)
  b.box(3, 6, 11, 3, 3, 1, 6).box(8, 6, 11, 3, 3, 1, 6)
  b.box(4, 2, 11, 6, 1, 1, 5)
  b.box(-2, 3, 3, 2, 4, 4, 8).box(14, 3, 3, 2, 4, 4, 8)
  b.box(6, 11, 4, 2, 3, 2, 8).ball(7, 15, 5, 1, 7)
  return b.done()
}

export function phone(): Model {
  const b = new Builder()
  b.box(0, 0, 0, 10, 18, 2, 6)
  b.box(1, 2, 2, 8, 14, 1, 4)
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) b.box(2 + c * 3, 4 + r * 3, 3, 2, 2, 1, [2, 3, 1, 4, 2, 7][r * 2 + c])
  b.box(3, 0, 2, 4, 1, 1, 8)
  return b.done()
}

export function camera(): Model {
  const b = new Builder()
  b.box(0, 0, 0, 18, 11, 7, 6)
  b.box(1, 10, 2, 5, 2, 3, 8)
  b.cyl(9, 2, 7, 4, 1, 8).cyl(9, 3, 7, 3, 1, 3)
  for (let y = 2; y <= 8; y++) for (let x = 5; x <= 13; x++) if ((x - 9) ** 2 + (y - 5) ** 2 <= 14) b.set(x, y, 7, 8).set(x, y, 8, (x - 9) ** 2 + (y - 5) ** 2 <= 5 ? 3 : 2)
  b.box(13, 8, 7, 3, 2, 1, 7)
  return b.done()
}

/** A phone with a dark screen; the chat is painted on a texture over it. */
export function phoneChat(): Model {
  const b = new Builder()
  b.box(0, 0, 0, 10, 18, 2, 6)
  b.box(1, 2, 2, 8, 14, 1, 6)
  b.box(3, 0, 2, 4, 1, 1, 8)
  return b.done()
}


/** A little jellyfish: a glassy bell and four trailing tentacles. */
export function jelly(): Model {
  const b = new Builder()
  for (let i = -5; i <= 5; i++) for (let j = 0; j <= 5; j++) for (let k = -5; k <= 5; k++) if (i * i + j * j + k * k <= 26 && i * i + k * k + (j * 1.1) ** 2 >= 8) b.set(i, j + 8, k, j > 3 ? 5 : 3)
  for (let i = -5; i <= 5; i++) for (let k = -5; k <= 5; k++) if (Math.abs(Math.hypot(i, k) - 4.5) < 0.7) b.set(i, 8, k, 2)
  b.set(-2, 12, 1, 4).set(-1, 12, 1, 4).set(0, 13, 0, 4)
  const arms: [number, number][] = [[-3, -2], [3, -2], [-1, 3], [2, 2]]
  arms.forEach(([x, z], n) => {
    for (let y = 0; y < 8; y++) b.set(x + Math.round(Math.sin(y * 0.9 + n) * 0.9), y, z, 4, `t${n}`, y / 8)
  })
  return b.done()
}

export const ICONS = { web, calendar, chat, robot, phone, camera }
export const STACK = [web, data, ai, vision]

export function bounds(m: Model) {
  const lo = [1e9, 1e9, 1e9]
  const hi = [-1e9, -1e9, -1e9]
  for (const v of m) {
    lo[0] = Math.min(lo[0], v.x)
    lo[1] = Math.min(lo[1], v.y)
    lo[2] = Math.min(lo[2], v.z)
    hi[0] = Math.max(hi[0], v.x + 1)
    hi[1] = Math.max(hi[1], v.y + 1)
    hi[2] = Math.max(hi[2], v.z + 1)
  }
  return { lo, hi, size: hi.map((h, i) => h - lo[i]) }
}
