// @ts-expect-error bun's test runner is not in the app's types
import { expect, test } from 'bun:test'
import { LATERAL, obstacles, PATHS, WALKER_RADIUS, type Circle, type Rect } from './layout'

const hitsRect = (x: number, z: number, r: Rect, pad: number) => Math.abs(x - r.x) < r.w / 2 + pad && Math.abs(z - r.z) < r.d / 2 + pad
const hitsCircle = (x: number, z: number, c: Circle, pad: number) => Math.hypot(x - c.x, z - c.z) < c.r + pad

test('walkers never touch a building, tree or landmark', () => {
  const { rects, circles } = obstacles()
  const pad = WALKER_RADIUS + LATERAL
  const bad: string[] = []
  PATHS.forEach((path, pi) => {
    for (let i = 1; i < path.length; i++) {
      const [x0, z0] = path[i - 1]
      const [x1, z1] = path[i]
      const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.25)
      for (let k = 0; k <= n; k++) {
        const x = x0 + ((x1 - x0) * k) / n
        const z = z0 + ((z1 - z0) * k) / n
        rects.forEach((r, ri) => hitsRect(x, z, r, pad) && bad.push(`path ${pi} at ${x.toFixed(1)},${z.toFixed(1)} hits rect ${ri} (${r.x},${r.z})`))
        circles.forEach((c, ci) => hitsCircle(x, z, c, pad) && bad.push(`path ${pi} at ${x.toFixed(1)},${z.toFixed(1)} hits circle ${ci} (${c.x},${c.z})`))
      }
    }
  })
  expect([...new Set(bad.map((b) => b.split(' at ')[0] + ' ' + b.split(' hits ')[1]))]).toEqual([])
})
