import type { Color, InstancedMesh } from 'three'
import type { Model } from './models'
import { lift, paint } from './scene'

/** Per-frame animation of the four stack structures: pure recolouring and lifting of tagged voxels. */
export function animateStack(i: number, mesh: InstancedMesh, pal: Color[], t: number) {
  const g = mesh.userData.groups as Record<string, number[]>
  const model = mesh.userData.model as Model
  if (i === 0) {
    // the page loads: a bar fills while the three window dots take turns
    const p = (t * 0.22) % 1.25
    for (const k of g.bar ?? []) paint(mesh, k, p > model[k].s! ? pal[1] : pal[3])
    for (const k of g.dot ?? []) paint(mesh, k, Math.sin(t * 3 + model[k].s! * 2) > 0.3 ? pal[model[k].c - 1] : pal[4])
  } else if (i === 1) {
    // the data discs breathe one after another
    for (let d = 0; d < 3; d++) lift(mesh, g[`d${d}`] ?? [], Math.sin(t * 1.6 + d * 1.1) * 0.9)
  } else if (i === 2) {
    // a signal runs through the network and the layers light up in turn
    for (let l = 0; l < 2; l++) {
      const head = (t * 0.7 - l * 0.5 + 4) % 1
      for (const k of g[`l${l}`] ?? []) {
        const d = Math.abs(head - model[k].s!)
        paint(mesh, k, Math.min(d, 1 - d) < 0.14 ? pal[3] : pal[7])
      }
    }
    const on = Math.floor((t * 1.1) % 3)
    for (let l = 0; l < 3; l++) for (const k of g[`n${l}`] ?? []) paint(mesh, k, l === on ? pal[4] : pal[model[k].c - 1])
  } else if (i === 3) {
    // the phone cycles its apps
    const cycle = [pal[1], pal[2], pal[0], pal[6]]
    for (let a = 0; a < 4; a++) for (const k of g[`app${a}`] ?? []) paint(mesh, k, cycle[(Math.floor(t * 0.8) + a) % 4])
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
}
