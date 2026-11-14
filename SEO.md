# SEO: checklist

## Antes de publicar
1. Build con `VITE_SITE_URL=https://quirelia.mx bun run build` (genera canonical, hreflang, sitemap y JSON-LD absolutos).
2. Rellenar `src/config.ts`: `whatsapp`, `email` y `sameAs` (LinkedIn, Instagram, GitHub). Entran al JSON-LD solo si tienen valor.
3. Confirmar que el hosting sirve `public/_headers` (Cloudflare Pages y Netlify lo leen; en otro hosting, replicar las cabeceras).

## Después de publicar
- Alta en Google Search Console, enviar `/sitemap.xml` y pedir indexación de `/` y `/en/`.
- Crear el Perfil de Negocio de Google (Tijuana, B.C.), misma información que el sitio, y pedir reseñas.
- Directorios con enlace al sitio: Clutch, GoodFirms, Cámara de comercio local, LinkedIn.
- Validar con Rich Results Test y PageSpeed Insights.

## Opcional (rendimiento)
- `public/art/*.png` pesan más que sus equivalentes WebP; convertirlos solo si se ve idéntico.
- `hero-poster-mobile.png` y los logos `01` y `02` de `public/` no se usan en la página (`03-simbolo-medusa.png` sí: `src/art.ts` lo usa para generar el favicon).
