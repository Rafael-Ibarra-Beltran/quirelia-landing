import { lazy, Suspense, useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { Stage, type ModeName, type StageHandle } from './components/Stage'
import { Contact } from './components/Contact'
import { Process } from './components/Process'
import { Packet } from './components/Packet'
import { Quiz } from './components/Quiz'
import { WhatsAppButton } from './components/WhatsAppButton'
import { config, primaryHref } from './config'
import { es } from './content'
import { en } from './content.en'
import { CopyContext, useCopy } from './lang'
import { Flag } from './components/Flags'

const VoxelDiorama = lazy(() => import('./components/VoxelDiorama'))
const VoxelTijuana = lazy(() => import('./components/VoxelTijuana'))
const VoxelPhone = lazy(() => import('./components/VoxelPhone'))

const ICONS = ['web', 'calendar', 'chat', 'robot', 'phone', 'camera']

// The Tijuana map ships in four widths (public/art/tijuana-<w>.avif|webp, made by scripts/images.sh). The box is at most 1112px wide.
const TOWN_WIDTHS = [800, 1200, 1600, 2400]
const townSet = (ext: string) => TOWN_WIDTHS.map((w) => `/art/tijuana-${w}.${ext} ${w}w`).join(', ')
const TOWN_SIZES = '(min-width: 1240px) 1112px, 100vw'

/** True once the element has come within 300px of the viewport (and stays true). Used to load three.js on demand. */
function useNear(ref: React.RefObject<HTMLElement | null>) {
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setNear(true), io.disconnect()), { rootMargin: '300px' })
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return near
}

function readMode(): ModeName {
  return typeof document !== 'undefined' && document.documentElement.dataset.mode === 'tecnico' ? 'tecnico' : 'negocio'
}

function Hero({ mode, title, lede, children }: { mode: ModeName; title: string; lede: string; children: React.ReactNode }) {
  // Both views ship in the HTML but only the plain one is the page's h1; the technical view keeps the same look as an h2.
  const Title = mode === 'negocio' ? 'h1' : 'h2'
  return (
    <div className="hero-copy">
      <Title className="hero-title" tabIndex={-1} id={`h1-${mode}`}>
        {title.split(' ').map((w, i) => (
          <span className="w" key={i}>{w} </span>
        ))}
      </Title>
      <p className="lede">{lede}</p>
      <div className="actions">{children}</div>
    </div>
  )
}

interface ShowcaseCopy {
  fitcoreTitle: string
  fitcoreText: string
  fitcoreCta: string
  fitcoreAdminCta: string
  fitcoreNote: string
  fitcoreItems: string[][]
  fitcoreAlt: string[]
  fitcoreCredit: string
}

/** The FitCore case: real captures of the demo and only what it really does. */
function Showcase({ c, id }: { c: ShowcaseCopy; id: string }) {
  return (
    <section className="section" id={id} aria-labelledby={`${id}-t`}>
      <div className="container showcase">
        <div className="showcase-text" data-reveal>
          <h2 id={`${id}-t`}>{c.fitcoreTitle}</h2>
          <p className="lede">{c.fitcoreText}</p>
          <ul className="showcase-list">
            {c.fitcoreItems.map(([h, p]) => (
              <li key={h}>
                <h3>{h}</h3>
                <p>{p}</p>
              </li>
            ))}
          </ul>
          {(config.fitcoreUrl || config.fitcoreAdminUrl) && (
            <>
              <div className="actions">
                {config.fitcoreUrl && <a className="btn btn-primary" href={config.fitcoreUrl} target="_blank" rel="noopener" aria-describedby={`${id}-note`}>{c.fitcoreCta}</a>}
                {config.fitcoreAdminUrl && <a className="btn btn-secondary" href={config.fitcoreAdminUrl} target="_blank" rel="noopener" aria-describedby={`${id}-note`}>{c.fitcoreAdminCta}</a>}
              </div>
              <p className="showcase-note" id={`${id}-note`}>{c.fitcoreNote}</p>
            </>
          )}
        </div>
        <figure className="shots" data-reveal>
          <img className="shot-main" src="/art/fitcore-landing.webp" alt={c.fitcoreAlt[0]} width="1200" height="750" loading="lazy" />
          <img className="shot-side" src="/art/fitcore-panel.webp" alt={c.fitcoreAlt[1]} width="900" height="563" loading="lazy" />
          <figcaption>{c.fitcoreCredit}</figcaption>
        </figure>
      </div>
    </section>
  )
}

/** Floating switch between the two views; shown once the hero and the footer are out of sight. */
function ModeFab({ mode, busy, onGo }: { mode: ModeName; busy: boolean; onGo: (next: ModeName, e: MouseEvent<HTMLElement>) => void }) {
  const { ui } = useCopy()
  const [show, setShow] = useState(false)
  useEffect(() => {
    const seen = new Set<Element>()
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)))
      setShow(seen.size === 0)
    })
    document.querySelectorAll('.stage, .footer').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  const next: ModeName = mode === 'tecnico' ? 'negocio' : 'tecnico'
  return (
    <a
      className="mode-fab"
      data-show={show}
      href={next === 'tecnico' ? '?modo=tecnico' : '?'}
      onClick={(e) => onGo(next, e)}
      aria-disabled={busy}
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
    >
      {next === 'tecnico' ? ui.fabTecnico : ui.fabNegocio}
    </a>
  )
}

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

export default function App({ lang: initialLang = 'es' }: { lang?: 'es' | 'en' }) {
  const [lang, setLang] = useState<'es' | 'en'>(initialLang)
  const c = lang === 'en' ? en : es
  const { negocio: n, tecnico: t, ui } = c
  const home = lang === 'en' ? '/en/' : '/'
  const [mode, setMode] = useState<ModeName>('negocio')
  const [busy, setBusy] = useState(false)
  const [pick, setPick] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [pinned, setPinned] = useState<number | null>(null)
  const place = hover ?? pinned
  const townBox = useRef<HTMLDivElement>(null)
  const dioramaBox = useRef<HTMLDivElement>(null)
  const stage = useRef<StageHandle>(null)

  // The inline script in index.html already set data-mode; adopt it after hydration.
  useEffect(() => setMode(readMode()), [])

  // One reveal system for the whole page: visible by default, hidden only under .js until it scrolls in.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))),
      { rootMargin: '0px 0px -8% 0px' },
    )
    const watch = () => document.querySelectorAll('[data-reveal]:not(.in)').forEach((el) => io.observe(el))
    watch()
    const mo = new MutationObserver(watch)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode', 'lang'] })
    const safety = setTimeout(() => document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('in')), 6000)
    return () => {
      io.disconnect()
      mo.disconnect()
      clearTimeout(safety)
    }
  }, [])

  const phoneBox = useRef<HTMLDivElement>(null)
  const showDiorama = useNear(dioramaBox)
  const showTown = useNear(townBox)
  const showPhone = useNear(phoneBox)

  const go = useCallback(
    (next: ModeName, e: MouseEvent<HTMLElement>) => {
      e.preventDefault()
      if (busy || next === mode) return
      const r = e.currentTarget.getBoundingClientRect()
      setBusy(true)
      const url = new URL(location.href)
      if (next === 'tecnico') url.searchParams.set('modo', 'tecnico')
      else url.searchParams.delete('modo')
      stage.current
        ?.transition(next, { x: r.left + r.width / 2, y: r.top + r.height / 2 }, () => {
          document.documentElement.dataset.mode = next
          setMode(next)
          history.replaceState(null, '', url)
          // the clicked link just left the page: move focus to the new view's heading
          document.getElementById(next === 'tecnico' ? 'h1-tecnico' : 'h1-negocio')?.focus({ preventScroll: true })
        })
        .finally(() => setBusy(false))
    },
    [busy, mode],
  )

  // Swap the language in place: fade the copy out, change it, fade it back in. The href still works without JS.
  const switchLang = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
      e.preventDefault()
      const next = lang === 'es' ? 'en' : 'es'
      const html = document.documentElement
      if (html.dataset.langSwitching) return
      const apply = () => {
        const dest = new URL(next === 'en' ? '/en/' : '/', location.href)
        dest.search = location.search
        history.pushState(null, '', dest)
        setLang(next)
      }
      if (reduced()) return apply()
      html.dataset.langSwitching = 'out'
      setTimeout(() => {
        apply()
        requestAnimationFrame(() => {
          html.dataset.langSwitching = 'in'
          setTimeout(() => delete html.dataset.langSwitching, 700)
        })
      }, 240)
    },
    [lang],
  )

  // keep <html lang>, title and description in step with the language
  useEffect(() => {
    document.documentElement.lang = lang
    document.title = ui.docTitle
    document.querySelector('meta[name="description"]')?.setAttribute('content', ui.docDesc)
  }, [lang, ui])

  // back/forward between / and /en/
  useEffect(() => {
    const onPop = () => setLang(location.pathname.startsWith('/en') ? 'en' : 'es')
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])

  const nav = (
    <header className="nav">
      <div className="container nav-row">
        <a className="brand" href={home} aria-label={ui.brandLabel}>
          <img src="/brand/logo-light.webp" width="168" height="56" alt={ui.brandAlt} />
        </a>
        <nav aria-label={ui.navLabel} className="nav-links">
          <span data-view="negocio"><a href="#soluciones">{ui.navSoluciones}</a><a href="#proceso">{ui.navProceso}</a></span>
          <span data-view="tecnico"><a href="#stack">{ui.navStack}</a><a href="#metodo">{ui.navMetodo}</a></span>
          <a href="#contacto">{ui.navContacto}</a>
          <a className="lang" href={ui.langSwitch.href} hrefLang={ui.langSwitch.hreflang} lang={ui.langSwitch.hreflang} title={ui.langSwitch.label} onClick={switchLang}><Flag lang={ui.langSwitch.hreflang as 'es' | 'en'} />{ui.langSwitch.short}</a>
          <a className="btn btn-primary btn-sm" href={primaryHref(ui)}>{ui.navCta}</a>
        </nav>
      </div>
    </header>
  )

  return (
    <CopyContext.Provider value={c}>
      <a className="skip" href="#principal">{ui.skip}</a>

      <Stage ref={stage} mode={mode} nav={nav}>
        <div data-view="negocio">
          <Hero mode="negocio" title={n.heroTitle} lede={n.heroLede}>
            <a className="btn btn-primary" href={primaryHref(ui)}>{ui.heroCta}</a>
          </Hero>
        </div>
        <div data-view="tecnico">
          <Hero mode="tecnico" title={t.heroTitle} lede={t.heroLede}>
            <a className="btn btn-primary" href={primaryHref(ui)}>{ui.heroCta}</a>
            <a className="btn btn-secondary" href={home} onClick={(e) => go('negocio', e)} aria-disabled={busy}>{ui.heroBack}</a>
          </Hero>
        </div>
      </Stage>

      <main id="principal" className="fade">
        <div data-view="negocio">
          <section className="section" aria-labelledby="prob-t">
            <div className="container">
              <h2 id="prob-t" data-reveal>{n.problemasTitle}</h2>
              <ul className="pains">
                {n.problemas.map(([q, a]) => (
                  <li key={q} data-reveal>
                    <h3>{q}</h3>
                    <p>{a}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="section" id="soluciones" aria-labelledby="sol-t">
            <div className="container">
              <h2 id="sol-t" data-reveal>{n.solucionesTitle}</h2>
              <ul className="sol">
                {n.soluciones.map(([h, p], i) => (
                  <li key={h} data-reveal>
                    <img src={`/art/icon-${ICONS[i]}.webp`} width="88" height="88" alt="" loading="lazy" />
                    <div>
                      <h3>{h}</h3>
                      <p>{p}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="section band" aria-labelledby="para-t">
            <div className="container">
              <h2 id="para-t" data-reveal>{n.paraQuienTitle}</h2>
              <div className="town">
                <div className="diorama-wrap town-map" ref={townBox} data-reveal>
                  <picture>
                    <source type="image/avif" srcSet={townSet('avif')} sizes={TOWN_SIZES} />
                    <img className="diorama-fallback" src="/art/tijuana-1200.webp" srcSet={townSet('webp')} sizes={TOWN_SIZES} alt={ui.mapAlt} width="1600" height="800" loading="lazy" />
                  </picture>
                  <Suspense fallback={null}>{showTown && <VoxelTijuana focus={place} />}</Suspense>
                </div>
                <ul className="who town-list" onMouseLeave={() => setHover(null)}>
                  {n.paraQuien.map(([h, p], i) => (
                    <li key={h} data-reveal data-lit={place === i} onMouseEnter={() => setHover(i)}>
                      <h3>
                        <button type="button" aria-pressed={pinned === i} onFocus={() => setHover(i)} onBlur={() => setHover(null)} onClick={() => setPinned(pinned === i ? null : i)}>{h}</button>
                      </h3>
                      <p>{p}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <Quiz />

          <Process title={n.procesoTitle} steps={n.proceso} />

          <Showcase c={n} id="fitcore" />

          <section className="section" aria-labelledby="faq-t">
            <div className="container faq">
              <h2 id="faq-t" data-reveal>{n.faqTitle}</h2>
              <div className="faq-list" data-reveal>
                {n.faq.map(([q, a]) => (
                  <details key={q}>
                    <summary>{q}</summary>
                    <p>{a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

        </div>

        <div data-view="tecnico">
          <section className="section" id="stack" aria-labelledby="stack-t">
            <div className="container">
              <h2 id="stack-t" data-reveal>{t.stackTitle}</h2>
              <div className="diorama-wrap" ref={dioramaBox} data-reveal>
                <img className="diorama-fallback" src="/art/diorama.webp" alt={ui.stackAlt} width="1000" height="560" loading="lazy" />
                <Suspense fallback={null}>{showDiorama && <VoxelDiorama active={null} onHover={setPick} />}</Suspense>
              </div>
              <ul className="who stack">
                {t.stack.map(([h, tools, why], i) => (
                  <li key={h} data-reveal data-lit={pick === i}>
                    <h3>{h}</h3>
                    <p className="tools">{tools}</p>
                    <p>{why}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="section" id="metodo" aria-labelledby="met-t">
            <div className="container">
              <h2 id="met-t" data-reveal>{t.metodoTitle}</h2>
              <ol className="method">
                {t.metodo.map(([h, p]) => (
                  <li key={h} data-reveal><h3>{h}</h3><p>{p}</p></li>
                ))}
              </ol>
            </div>
          </section>

          <section className="section band" aria-labelledby="rag-t">
            <div className="container">
              <div className="rag-head">
                <h2 id="rag-t" data-reveal>{t.ragTitle}</h2>
                <div className="phone-wrap" ref={phoneBox}>
                  <p className="visually-hidden">{t.chat.title}: {t.chat.user} {t.chat.bot} ({t.chat.source}). {t.chat.note}.</p>
                  <div aria-hidden="true">
                    <Suspense fallback={null}>{showPhone && <VoxelPhone chat={t.chat} />}</Suspense>
                  </div>
                </div>
              </div>
              <div className="pipeline-wrap" data-reveal>
                <ol className="pipeline" aria-label={ui.ragLabel}>
                  {t.rag.map(([h, p]) => (
                    <li key={h}><h3>{h}</h3><p>{p}</p></li>
                  ))}
                </ol>
                <Packet />
              </div>
            </div>
          </section>

          <Showcase c={t} id="fitcore-tecnico" />
        </div>

        <Contact />
      </main>

      <WhatsAppButton />
      <ModeFab mode={mode} busy={busy} onGo={go} />

      <footer className="footer deep fade">
        <div className="container footer-row">
          <img src="/brand/logo-light.webp" width="132" height="44" alt={ui.brandAlt} />
          <p>{ui.footerLine}</p>
          <p>2026</p>
        </div>
      </footer>
    </CopyContext.Provider>
  )
}
