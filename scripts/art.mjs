// Regenerates the images in public/art with the same jellyfish engine as the page.
// Usage: bun run art [baseUrl]   (needs the dev server running, default http://localhost:5173)
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const base = process.argv[2] ?? 'http://localhost:5173'
const brave = process.env.BROWSER_PATH ?? '/opt/brave.com/brave-origin-nightly/brave-origin-nightly'
const icons = ['web', 'calendar', 'chat', 'robot', 'phone', 'camera']
const scenes = [['logo-light', 'brand/logo-light'], ['symbol-light', 'brand/symbol-light'], ['favicon', 'brand/favicon'], ['apple-touch', 'brand/apple-touch-icon'], ['hero', 'hero-poster'], ['hero-mobile', 'hero-poster-mobile'], ['og', 'og'], ['og-en', 'og-en'], ['diorama', 'diorama'], ['tijuana', 'tijuana'], ...icons.map((n) => [`icon-${n}`, `icon-${n}`])]
const only = process.env.ONLY?.split(',') // for example ONLY=icon,diorama
mkdirSync('public/art', { recursive: true })
mkdirSync('public/brand', { recursive: true })
// the Tijuana map is heavy: render it on the real GPU; everything else keeps the software renderer
const gpu = process.env.ONLY?.split(',').every((o) => 'tijuana'.startsWith(o))
const browser = await chromium.launch({ executablePath: brave, args: ['--no-sandbox', '--headless=new', ...(gpu ? ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist'] : ['--disable-gpu'])] })
for (const [scene, name] of scenes) {
  if (only && !only.some((o) => name.startsWith(o))) continue
  const page = await browser.newPage({ viewport: scene === 'tijuana' ? { width: 2500, height: 1300 } : { width: 1500, height: 960 } })
  await page.goto(`${base}/art.html?scene=${scene}`)
  await page.waitForFunction(() => window.ready === true || window.failed, null, { timeout: 60000 })
  const failed = await page.evaluate(() => window.failed)
  if (failed) throw new Error(`scene ${scene} failed: ${failed}`)
  const file = name.includes('/') ? `public/${name}.png` : `public/art/${name}.png`
  await page.locator('#out').screenshot({ path: file, omitBackground: true })
  console.log('wrote', file)
  await page.close()
}
await browser.close()
process.exit(0)
