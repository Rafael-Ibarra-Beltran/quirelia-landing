// Contact points and demo links the owner supplies. Empty values are handled: the page never shows an invented contact or an empty demo button.
export const config = {
  whatsapp: '526634202392', // digits only with country code
  email: 'contacto@quirelia.mx',
  formEndpoint: '', // a Formspree-style URL that accepts a JSON POST
  fitcoreUrl: 'https://fitcore.quirelia.mx/', // FitCore demo landing; when empty its button is hidden
  fitcoreAdminUrl: 'https://app.fitcore.quirelia.mx/', // FitCore demo admin panel; when empty its button is hidden
  sameAs: [] as string[], // public profiles for search engines: LinkedIn, Instagram, GitHub, Google Business Profile
}

/** Primary action target: WhatsApp, then email, then the contact form. */
export function primaryHref(ui: { waMessage: string; mailSubject: string }): string {
  if (config.whatsapp) return waHref(ui.waMessage)
  if (config.email) return `mailto:${config.email}?subject=${encodeURIComponent(ui.mailSubject)}`
  return '#contacto'
}

/** WhatsApp link, or the contact form while no number is set. `text` is the prefilled message. */
export function waHref(text: string): string {
  return config.whatsapp ? `https://wa.me/${config.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(text)}` : '#contacto'
}
