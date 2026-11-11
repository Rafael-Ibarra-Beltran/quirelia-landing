import type { JellySpec } from './species'

/** Hero shoal: giant ones to the right, mid ones in the water, small far ones in the corners away from the copy. */
export function heroLayout(w: number, h: number): JellySpec[] {
  if (w < 720) {
    const r = Math.min(w * 0.24, 96)
    return [
      { species: 'nettle', x: 0.7, y: 0.66, r: r * 1.15, phase: 0.4, speed: 0.3, depth: 1, tint: 1 },
      { species: 'moon', x: 0.2, y: 0.78, r, phase: 1.3, speed: 0.34, depth: 0.8 },
      { species: 'comb', x: 0.9, y: 0.93, r: r * 0.55, phase: 2.2, speed: 0.4, depth: 0.6 },
      { species: 'crown', x: 0.5, y: 0.95, r: r * 0.5, phase: 3.1, speed: 0.42, depth: 0.4 },
      { species: 'moon', x: 0.08, y: 0.58, r: r * 0.3, phase: 4.1, speed: 0.46, depth: 0.15 },
    ]
  }
  return [
    { species: 'moon', x: 0.76, y: 0.3, r: h * 0.2, phase: 0.4, speed: 0.3, depth: 1, tint: 1 },
    { species: 'nettle', x: 0.97, y: 0.62, r: h * 0.15, phase: 1.3, speed: 0.34, depth: 0.85 },
    { species: 'comb', x: 0.58, y: 0.5, r: h * 0.1, phase: 2.2, speed: 0.4, depth: 0.7 },
    { species: 'crown', x: 0.82, y: 0.8, r: h * 0.085, phase: 3.1, speed: 0.42, depth: 0.55 },
    { species: 'moon', x: 0.48, y: 0.1, r: h * 0.05, phase: 4.1, speed: 0.46, depth: 0.2 },
    { species: 'comb', x: 0.04, y: 0.16, r: h * 0.055, phase: 5.8, speed: 0.44, depth: 0.12 },
    { species: 'nettle', x: 0.55, y: 0.92, r: h * 0.06, phase: 5.1, speed: 0.5, depth: 0.1 },
    { species: 'moon', x: 0.03, y: 0.5, r: h * 0.04, phase: 6.1, speed: 0.5, depth: 0.08 },
  ]
}
