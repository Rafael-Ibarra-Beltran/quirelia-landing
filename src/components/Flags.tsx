/** Tiny inline flags (emoji flags do not render on Windows). Decorative: the link carries the label. */
export function Flag({ lang }: { lang: 'es' | 'en' }) {
  const p = { width: 18, height: 12, viewBox: '0 0 18 12', 'aria-hidden': true, className: 'flag' } as const
  if (lang === 'es')
    return (
      <svg {...p}>
        <rect width="6" height="12" fill="#006847" />
        <rect x="6" width="6" height="12" fill="#f4f1e8" />
        <rect x="12" width="6" height="12" fill="#ce1126" />
        <circle cx="9" cy="6" r="1.5" fill="#8c6d2f" />
      </svg>
    )
  return (
    <svg {...p}>
      <rect width="18" height="12" fill="#f4f1e8" />
      {[0, 2, 4, 6, 8, 10].map((y) => <rect key={y} y={y} width="18" height="1.2" fill="#b22234" />)}
      <rect width="8" height="6.4" fill="#3c3b6e" />
    </svg>
  )
}
