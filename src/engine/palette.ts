export type Scheme = 'deep' | 'light'

export const NT = 16 // body tones
export const NA = 8 // ASCII colour levels

export interface Palette {
  colors: Uint32Array // NT tones by rising density, then highlight (NT) and coral (NT + 1), packed for ImageData
  css: string[] // the same colours as CSS strings
  halo: Uint32Array // 5 alpha levels, 0 = none
  ray: Uint32Array // 3 alpha levels
  snow: Uint32Array // dim, bright
  band: { fillS: RGB; fillT: RGB; foamS: RGB; foamT: RGB } // the water line's page colour and foam in the plain and in the technical view, both always known
  scale: number // density that reaches the last tone
  ascii: string[] // NA levels, then the accent
  asciiBox: string // faint cell background behind the hottest glyphs
}

export type RGB = [number, number, number]
let probe: CanvasRenderingContext2D | null = null

function parse(css: string): RGB {
  if (!probe) {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    probe = c.getContext('2d', { willReadFrequently: true })!
  }
  probe.clearRect(0, 0, 1, 1)
  if (css) {
    probe.fillStyle = css
    probe.fillRect(0, 0, 1, 1)
  }
  const d = probe.getImageData(0, 0, 1, 1).data
  return [d[0], d[1], d[2]]
}
const pack = (c: RGB, a = 1) => ((Math.round(a * 255) << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0
const str = (c: RGB, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

function ramp(anchors: RGB[], n: number): RGB[] {
  const out: RGB[] = []
  for (let i = 0; i < n; i++) {
    const f = (i / (n - 1)) * (anchors.length - 1)
    const k = Math.min(anchors.length - 2, Math.floor(f))
    const a = anchors[k]
    const b = anchors[k + 1]
    out.push([0, 1, 2].map((c) => Math.round(a[c] + (b[c] - a[c]) * (f - k))) as RGB)
  }
  return out
}

/** Every colour comes from a CSS custom property, so the canvas follows the theme. */
export function readPalette(el: Element, scheme: Scheme): Palette {
  const cs = getComputedStyle(el)
  const g = (n: string) => parse(cs.getPropertyValue(n).trim())
  const t: RGB[] = []
  for (let i = 1; i <= 8; i++) t.push(g(`--jelly-${scheme}-${i}`))
  // tokens run 1 outline .. 7 highlight; density maps dark to light in deep water and pale to ink on paper
  const body = ramp(scheme === 'deep' ? t.slice(0, 7) : [t[5], t[4], t[3], t[2], t[1], t[0]], NT)
  const all = [...body, t[6], t[7]]
  const halo = g(`--jelly-${scheme}-halo`)
  const ray = g(`--jelly-${scheme}-ray`)
  const snow = g(`--jelly-${scheme}-snow`)
  const asc = ramp([g('--ascii-deep'), g('--ascii-dim'), g('--ascii-base'), g('--ascii-bright'), g('--ascii-hot')], NA)
  const tok = (n: string, fb: string) => parse(cs.getPropertyValue(n).trim() || fb)
  const band = { fillS: tok('--surface-fill-simple', '#F8F6F2'), fillT: tok('--surface-fill-tech', '#182230'), foamS: tok('--surface-foam-simple', '#8FB0F0'), foamT: tok('--surface-foam-tech', '#7EA2EC') }
  return {
    colors: Uint32Array.from(all.map((c) => pack(c))),
    css: all.map((c) => str(c)),
    halo: Uint32Array.from([0, 0.25, 0.5, 0.75, 1].map((a) => (a ? pack(halo, a) : 0))),
    ray: Uint32Array.from([0, 0.45, 0.9].map((a) => (a ? pack(ray, a) : 0))),
    snow: Uint32Array.from([pack(snow, 0.45), pack(snow, 1)]),
    band,
    scale: scheme === 'deep' ? 1.0 : 1.05,
    ascii: [...asc.map((c) => str(c)), str(g('--jelly-deep-8'))],
    asciiBox: str(g('--ascii-dim'), 0.3),
  }
}
