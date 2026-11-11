import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { resolve } from 'node:path'

// Absolute URLs for canonical links, hreflang and social cards. Build with VITE_SITE_URL=https://yourdomain.com
const site = (process.env.VITE_SITE_URL ?? '').replace(/\/$/, '')
const siteUrl = (): Plugin => ({ name: 'site-url', transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', site) })

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), siteUrl()],
  build: isSsrBuild ? {} : { rollupOptions: { input: { main: resolve(__dirname, 'index.html'), en: resolve(__dirname, 'en/index.html') } } },
}))
