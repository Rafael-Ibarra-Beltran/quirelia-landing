// Everything the owner still has to supply. Empty values are handled: the page never shows an invented contact.
export const config = {
  whatsapp: '', // digits only with country code, for example '5216641234567'
  email: '', // for example 'hola@quirelia.studio'
  formEndpoint: '', // a Formspree-style URL that accepts a JSON POST
  fitcoreUrl: '', // when set, the FitCore demo section appears
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
