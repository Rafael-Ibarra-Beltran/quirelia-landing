// Injects the server-rendered markup into each built page so the site works without JavaScript,
// and writes robots.txt and sitemap.xml (the sitemap only when VITE_SITE_URL is set).
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const dist = resolve('dist')
const { render } = await import(pathToFileURL(resolve('dist-ssr/entry-server.js')).href)

for (const [lang, file] of [['es', 'index.html'], ['en', 'en/index.html']] as const) {
  const path = `${dist}/${file}`
  if (!existsSync(path)) throw new Error(`${path} was not built`)
  const html = readFileSync(path, 'utf8')
  if (!html.includes('<!--app-->')) throw new Error(`${path} has no <!--app--> marker`)
  writeFileSync(path, html.replace('<!--app-->', render(lang)))
  console.log('prerendered', file)
}
rmSync(resolve('dist-ssr'), { recursive: true })

const site = (process.env.VITE_SITE_URL ?? '').replace(/\/$/, '')
writeFileSync(`${dist}/robots.txt`, `User-agent: *\nAllow: /\n${site ? `Sitemap: ${site}/sitemap.xml\n` : ''}`)
if (site) {
  const alt = `<xhtml:link rel="alternate" hreflang="es" href="${site}/"/><xhtml:link rel="alternate" hreflang="en" href="${site}/en/"/>`
  writeFileSync(
    `${dist}/sitemap.xml`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n<url><loc>${site}/</loc>${alt}</url>\n<url><loc>${site}/en/</loc>${alt}</url>\n</urlset>\n`,
  )
} else console.log('VITE_SITE_URL is not set: no sitemap.xml, canonical and og:image stay relative')
