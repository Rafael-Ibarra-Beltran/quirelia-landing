import { useRef, useState } from 'react'
import { config, waHref } from '../config'
import { useCopy } from '../lang'

/** Three short questions, then a recommendation and a prefilled message. Nothing leaves the browser until the visitor sends it. */
export function Quiz() {
  const { negocio: n, quiz: q } = useCopy()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const legend = useRef<HTMLLegendElement>(null)
  const done = step >= q.steps.length

  const pick = (i: number) => {
    setAnswers((a) => [...a.slice(0, step), i])
    setStep(step + 1)
    requestAnimationFrame(() => legend.current?.focus())
  }
  const restart = () => {
    setStep(0)
    setAnswers([])
    requestAnimationFrame(() => legend.current?.focus())
  }

  const recs = done ? q.recs[answers[1]].map((k) => n.soluciones[k]) : []
  const text = done
    ? q.message
        .replace('{type}', q.steps[0].options[answers[0]].toLowerCase())
        .replace('{time}', q.steps[1].options[answers[1]].toLowerCase())
        .replace('{goal}', q.steps[2].options[answers[2]].toLowerCase())
        .replace('{recs}', recs.map((r) => r[0].toLowerCase()).join(', '))
    : ''
  const prefill = () => window.dispatchEvent(new CustomEvent('prefill', { detail: text }))

  return (
    <section className="section" id="cuestionario" aria-labelledby="quiz-t">
      <div className="container quiz">
        <div data-reveal>
          <h2 id="quiz-t">{q.title}</h2>
          <p className="lede">{q.lede}</p>
        </div>
        <div className="quiz-panel" data-reveal aria-live="polite">
          {!done ? (
            <fieldset className="quiz-step">
              <legend ref={legend} tabIndex={-1}>{q.steps[step].legend}</legend>
              <div className="chips" data-n={q.steps[step].options.length}>
                {q.steps[step].options.map((o, i) => (
                  <button key={o} type="button" className="chip" onClick={() => pick(i)}>{o}</button>
                ))}
              </div>
            </fieldset>
          ) : (
            <div className="quiz-step">
              <h3 ref={legend as unknown as React.RefObject<HTMLHeadingElement>} tabIndex={-1}>{q.resultTitle}</h3>
              <ul className="quiz-recs">
                {recs.map(([h, p]) => (
                  <li key={h}>
                    <strong>{h}</strong>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <div className="actions">
                <a className="btn btn-primary" href={config.whatsapp ? waHref(text) : '#contacto'} onClick={config.whatsapp ? undefined : prefill} {...(config.whatsapp ? { target: '_blank', rel: 'noreferrer' } : {})}>{q.cta}</a>
                <button type="button" className="btn btn-secondary" onClick={restart}>{q.again}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
