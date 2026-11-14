import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { resolve } from 'node:path'

// Absolute URLs for canonical links, hreflang and social cards. Set VITE_SITE_URL in the environment or in .env
const siteUrl = (site: string): Plugin => ({ name: 'site-url', transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', site) })

// Preload the two latin text fonts (display and body) so the first paint does not wait for the CSS to name them.
const preloadFonts = (): Plugin => ({
  name: 'preload-fonts',
  transformIndexHtml: {
    order: 'post',
    handler(html, ctx) {
      if (!ctx.bundle) return html
      const files = Object.keys(ctx.bundle).filter((f) => /(sora|dm-sans).*-latin-wght-normal.*\.woff2$/.test(f))
      const tags = files.map((f) => `<link rel="preload" as="font" type="font/woff2" href="/${f}" crossorigin />`).join('\n    ')
      return tags ? html.replace('</head>', `    ${tags}\n  </head>`) : html
    },
  },
})

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild, mode }) => ({
  plugins: [react(), siteUrl((loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL ?? '').replace(/\/$/, '')), preloadFonts()],
  build: isSsrBuild ? {} : { rollupOptions: { input: { main: resolve(import.meta.dirname, 'index.html'), en: resolve(import.meta.dirname, 'en/index.html') } } },
}))
