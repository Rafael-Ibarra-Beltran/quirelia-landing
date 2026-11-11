import type { Builder } from '../models'

// 3x5 pixel capitals, enough for the signs of the town.
const G: Record<string, string[]> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'], E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'], I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'], K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'], N: ['##.', '#.#', '#.#', '#.#', '#.#'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'], R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'], U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'], Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
  ' ': ['...', '...', '...', '...', '...'],
}

/** Width in voxels of a string at a scale (letters are 3 wide plus a 1 voxel gap). */
export const textWidth = (s: string, scale = 1) => (s.length * 4 - 1) * scale

/** Draw a string on the plane z, facing +z, with its lower left corner at (x, y). Colour may vary per letter. */
export function text(b: Builder, s: string, x: number, y: number, z: number, c: number | number[], scale = 1) {
  ;[...s.toUpperCase()].forEach((ch, n) => {
    const g = G[ch] ?? G[' ']
    const col = Array.isArray(c) ? c[n % c.length] : c
    for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) if (g[r][k] === '#') b.box(x + (n * 4 + k) * scale, y + (4 - r) * scale, z, scale, scale, 1, col)
  })
}
