import { useEffect, useState, type FormEvent } from 'react'
import { config } from '../config'
import { useCopy } from '../lang'
import { LiveCanvas } from './LiveCanvas'
import type { JellySpec } from '../engine/species'

const shoal = (w: number, h: number): JellySpec[] => [
  { species: 'moon', x: 0.1, y: 0.2, r: h * 0.12, phase: 0.4, speed: 0.34, depth: 1 },
  { species: 'nettle', x: 0.92, y: 0.18, r: h * 0.13, phase: 1.3, speed: 0.3, depth: 0.8, tint: 1 },
  { species: 'comb', x: 0.5, y: 0.2, r: h * 0.06, phase: 2.2, speed: 0.4, depth: 0.4 },
  { species: 'crown', x: 0.04, y: 0.7, r: h * 0.06, phase: 3.1, speed: 0.42, depth: 0.2 },
  { species: 'moon', x: 0.96, y: 0.75, r: Math.min(w, h) * 0.05, phase: 4.1, speed: 0.46, depth: 0.1 },
]

type Status = 'idle' | 'sending' | 'sent' | 'error'

export function Contact() {
  const { contacto, negocio, form: f, ui } = useCopy()
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  // the quiz sends its summary here when there is no WhatsApp number yet
  useEffect(() => {
    const fill = (e: Event) => {
      const box = document.getElementById('f-mensaje') as HTMLTextAreaElement | null
      if (box) box.value = (e as CustomEvent<string>).detail
    }
    window.addEventListener('prefill', fill)
    return () => window.removeEventListener('prefill', fill)
  }, [])

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    if (data.get('empresa')) return // honeypot: bots fill it
    const name = String(data.get('nombre') ?? '').trim()
    const how = String(data.get('contacto') ?? '').trim()
    const msg = String(data.get('mensaje') ?? '').trim()
    if (!name || !msg) return fail(f.errMissing)
    if (!how.includes('@') && how.replace(/\D/g, '').length < 8) return fail(f.errContact)

    const text = `${msg}\n\n${f.nameLine}: ${name}\n${f.contactLine}: ${how}`
    if (config.formEndpoint) {
      setStatus('sending')
      setError('')
      try {
        const res = await fetch(config.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ name, contact: how, message: msg }), signal: AbortSignal.timeout(10000) })
        if (!res.ok) throw new Error(String(res.status))
        setStatus('sent')
        form.reset()
      } catch {
        setStatus('error')
        setError(f.errEndpoint)
      }
      return
    }
    if (config.email) window.location.href = `mailto:${config.email}?subject=${encodeURIComponent(ui.mailSubject)}&body=${encodeURIComponent(text)}`
    else if (config.whatsapp) window.location.href = `https://wa.me/${config.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
    else fail(f.errNoChannel)
  }
  function fail(m: string) {
    setStatus('error')
    setError(m)
  }

  return (
    <section className="section deep contact-sec" id="contacto" aria-labelledby="contacto-t">
      <div className="contact-water"><LiveCanvas specs={shoal} deep snow={40} edge="top" interactive={false} /></div>
      <div className="container">
        <div className="contact">
          <div className="contact-head">
            <h2 id="contacto-t">{contacto.title}</h2>
            <p className="lede">{contacto.lede}</p>
            <p>{negocio.quienTitle} {negocio.quienText}</p>
            <div className="contact-actions">
              {config.email && <a className="btn btn-secondary" href={`mailto:${config.email}`}>{config.email}</a>}
            </div>
          </div>
          <form className="form" onSubmit={submit} noValidate aria-describedby={error ? 'form-msg' : undefined}>
            <div className="field">
              <label htmlFor="f-nombre">{f.name}</label>
              <input id="f-nombre" name="nombre" autoComplete="name" required />
            </div>
            <div className="field">
              <label htmlFor="f-contacto">{f.how}</label>
              <input id="f-contacto" name="contacto" autoComplete="email" required />
            </div>
            <div className="field">
              <label htmlFor="f-mensaje">{contacto.messageLabel}</label>
              <textarea id="f-mensaje" name="mensaje" rows={4} required />
            </div>
            <input className="hp" name="empresa" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <button className="btn btn-primary" type="submit" disabled={status === 'sending'} aria-busy={status === 'sending'}>
              {status === 'sending' ? f.sending : f.send}
            </button>
            <p id="form-msg" className="form-msg" role="status">
              {status === 'sent' ? f.sent : status === 'error' ? error : ''}
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}
