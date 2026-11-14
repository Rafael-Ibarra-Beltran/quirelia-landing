// Injects the server-rendered markup into each built page so the site works without JavaScript,
// and writes robots.txt and sitemap.xml (the sitemap only when VITE_SITE_URL is set).
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { config } from '../src/config'
import { es } from '../src/content'
import { en } from '../src/content.en'

const dist = resolve('dist')
const site = (process.env.VITE_SITE_URL ?? '').replace(/\/$/, '')
if (!site) throw new Error('VITE_SITE_URL is not set (env or .env): canonical, hreflang, og:image and sitemap would be relative or missing. See .env.example.')

// Structured data: business, website and FAQ, built from the same copy the page shows.
const jsonLd = (lang: 'es' | 'en') => {
  const c = lang === 'es' ? es : en
  const url = `${site}${lang === 'es' ? '/' : '/en/'}`
  const org = {
    '@type': ['ProfessionalService', 'LocalBusiness'],
    '@id': `${site}/#org`,
    name: 'Quirelia Studio',
    description: c.ui.docDesc,
    url: `${site}/`,
    logo: `${site}/04-logo-q-integrada.png`,
    image: `${site}/art/${lang === 'es' ? 'og' : 'og-en'}.png`,
    address: { '@type': 'PostalAddress', addressLocality: 'Tijuana', addressRegion: 'Baja California', addressCountry: 'MX' },
    areaServed: [{ '@type': 'Country', name: 'México' }, { '@type': 'City', name: 'Tijuana' }],
    knowsLanguage: ['es', 'en'],
    knowsAbout: ['Software a medida', 'Desarrollo de software a medida', 'Custom software development', 'Desarrollo web', 'Automatización de mensajes', 'Inteligencia artificial', 'Aplicaciones móviles', 'Visión por computadora'],
    ...(config.email && { email: config.email }),
    ...(config.whatsapp && { telephone: `+${config.whatsapp.replace(/\D/g, '')}` }),
    ...(config.sameAs.length && { sameAs: config.sameAs }),
  }
  const webSite = { '@type': 'WebSite', '@id': `${site}/#site`, url: `${site}/`, name: 'Quirelia Studio', inLanguage: lang, publisher: { '@id': `${site}/#org` } }
  const faq = { '@type': 'FAQPage', '@id': `${url}#faq`, inLanguage: lang, mainEntity: c.negocio.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': [org, webSite, faq] })}</script>`
}
const { render } = await import(pathToFileURL(resolve('dist-ssr/entry-server.js')).href)

for (const [lang, file] of [['es', 'index.html'], ['en', 'en/index.html']] as const) {
  const path = `${dist}/${file}`
  if (!existsSync(path)) throw new Error(`${path} was not built`)
  const html = readFileSync(path, 'utf8')
  if (!html.includes('<!--app-->')) throw new Error(`${path} has no <!--app--> marker`)
  writeFileSync(path, html.replace('<!--app-->', render(lang)).replace('<!--jsonld-->', jsonLd(lang)))
  console.log('prerendered', file)
}
rmSync(resolve('dist-ssr'), { recursive: true })

writeFileSync(`${dist}/robots.txt`, `User-agent: *\nAllow: /\n${site ? `Sitemap: ${site}/sitemap.xml\n` : ''}`)
if (site) {
  const today = new Date().toISOString().slice(0, 10)
  const alt = `<xhtml:link rel="alternate" hreflang="es" href="${site}/"/><xhtml:link rel="alternate" hreflang="en" href="${site}/en/"/><xhtml:link rel="alternate" hreflang="x-default" href="${site}/"/>`
  writeFileSync(
    `${dist}/sitemap.xml`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n<url><loc>${site}/</loc><lastmod>${today}</lastmod>${alt}</url>\n<url><loc>${site}/en/</loc><lastmod>${today}</lastmod>${alt}</url>\n</urlset>\n`,
  )
} else console.log('VITE_SITE_URL is not set: no sitemap.xml, canonical and og:image stay relative')
