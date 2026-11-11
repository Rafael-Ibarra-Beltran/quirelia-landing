// Screenshot helper (Brave headless through playwright-core).
// node scripts/shot.mjs <url> <out.png> [--w 1440] [--h 900] [--full] [--scroll] [--sections ".a,#b"] [--ids a,b,c] [--click "sel"] [--wait 2600]
//  --scroll    scrolls the whole page first so scroll reveals fire
//  --sections  one screenshot per selector, centred in the viewport (out-<n>.png)
//  --ids       one screenshot per element id (out-<id>.png), waits for window.ready if present
//  --click     clicks the selector, waits --wait ms, then screenshots
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const a = process.argv.slice(2)
const url = a[0]
const out = a[1]
const opt = (k, d) => (a.includes(`--${k}`) ? a[a.indexOf(`--${k}`) + 1] : d)
const flag = (k) => a.includes(`--${k}`)
mkdirSync(dirname(out), { recursive: true })
const brave = process.env.BROWSER_PATH ?? '/opt/brave.com/brave-origin-nightly/brave-origin-nightly'
const b = await chromium.launch({ executablePath: brave, args: ['--no-sandbox', '--headless=new', '--disable-gpu'] })
const p = await b.newPage({ viewport: { width: +opt('w', 1440), height: +opt('h', 900) } })
p.on('console', (m) => m.type() === 'error' && !m.text().includes('404') && console.log('ERR', m.text()))
p.on('pageerror', (e) => console.log('PAGEERR', e.message))
await p.goto(url)
await p.waitForFunction(() => window.ready === true || window.ready === undefined, null, { timeout: 20000 }).catch(() => console.log('not ready'))
await p.waitForTimeout(1200)
if (flag('scroll')) {
  const total = await p.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < total; y += 300) {
    await p.evaluate((v) => window.scrollTo(0, v), y)
    await p.waitForTimeout(200)
  }
  await p.evaluate(() => window.scrollTo(0, 0))
  await p.waitForTimeout(500)
}
const base = out.replace(/\.png$/, '')
if (opt('ids')) {
  for (const id of opt('ids').split(',')) await p.locator('#' + id).screenshot({ path: `${base}-${id}.png` })
  console.log('ms', JSON.stringify(await p.evaluate(() => (window.ms ? window.ms() : null))))
} else if (opt('sections')) {
  let n = 0
  for (const s of opt('sections').split(',')) {
    await p.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: 'center' }), s)
    await p.waitForTimeout(900)
    await p.screenshot({ path: `${base}-${n++}.png` })
  }
} else {
  if (opt('click')) {
    await p.click(opt('click'))
    await p.waitForTimeout(+opt('wait', 2600))
  }
  await p.screenshot({ path: out, fullPage: flag('full') })
}
await b.close()
process.exit(0)
