// English copy. Same shape as content.ts; the compiler checks it. Translation by the studio's assistant, to be reviewed by the owner.
import type { Copy } from './content'

const negocio = {
  heroTitle: 'Technology that connects your business.',
  heroLede: 'We make your website, your bookings and your messages work together.',
  problemasTitle: 'Sound familiar?',
  problemas: [
    ['Customers message me on WhatsApp all day and orders get lost.', 'An orders and messaging system that keeps everything in order.'],
    ['My customers always ask the same things: hours, prices, location.', 'An AI assistant that answers with your business information.'],
    ['I keep bookings and accounts in notebooks and loose sheets.', 'Bookings and control in one place, always at hand.'],
    ['My website is old or almost nobody finds me online.', 'A fast, clear website designed for phones.'],
  ],
  solucionesTitle: 'Fewer repetitive tasks. More time for your customers.',
  soluciones: [
    ['A website that works for you', 'Menu, hours and location, clear on a phone.'],
    ['Bookings and orders', 'Your customers book or order on their own.'],
    ['Messages and reminders', 'Automatic confirmations and reminders.'],
    ['An assistant that answers', 'Answers questions with your business information.'],
    ['Mobile apps', "Your business in your customers' pocket."],
    ['Cameras that count', 'Count people or check stock with computer vision.'],
  ],
  paraQuienTitle: 'Restaurants, gyms and local businesses.',
  paraQuien: [
    ['Restaurants', 'Your customer sees the menu, books a table and orders from their phone. You receive everything in order.'],
    ['Gyms', 'Your members book classes and get payment reminders. You chase no one.'],
    ['Local businesses', 'They find you on Google, message you and book without phone calls.'],
    ['People with a project', 'An idea that needs a website, app or automation to get started right.'],
  ],
  procesoTitle: 'How we work.',
  proceso: [
    ['We talk', 'You tell us what takes your time and what you want to achieve.'],
    ['We propose', 'What we would do, what it costs and how long it takes.'],
    ['We build', 'You see progress and we adjust before finishing.'],
    ['We stay with you', 'We stay close for changes and maintenance.'],
  ],
  faqTitle: 'What people usually ask.',
  faq: [
    ['How much does it cost?', 'It depends on what you need. In the first conversation we give you a proposal with a clear price before we start.'],
    ['How long does it take?', 'It depends on the scope. Before we start we agree on dates in writing.'],
    ['Is the site mine?', 'Yes. Your domain, your content and your information are yours.'],
    ['Do I need to know about technology?', 'No. We explain everything in plain words and handle the technical part.'],
    ['What happens after delivery?', 'We stay close: we fix, improve and maintain if you need it.'],
  ],
  fitcoreTitle: 'An example of what we build.',
  fitcoreText: 'FitCore is a fictional gym demo: the website, the dashboard and the assistant working together.',
  fitcoreCta: 'Open the FitCore demo',
  fitcoreItems: [
    ['Bookings with capacity', 'Each class fills up on its own and says when it is full.'],
    ['A WhatsApp assistant', "Answers questions and books classes using the gym's information."],
    ['Automatic reminders', 'Renewal and welcome messages without writing them by hand.'],
    ['Capacity by camera', 'Counts people to know how many are in the gym.'],
  ],
  fitcoreAlt: ['Public page of the FitCore demo, a fictional gym, with a person working out.', 'Sign-in screen of the FitCore admin dashboard.'],
  fitcoreCredit: 'Screenshots of the FitCore demo. Videos by cottonbro studio and Boris Ivas, Pexels.',
  quienTitle: 'A small studio with a direct line.',
  quienText: 'You talk directly with the person who designs and builds your project.',
}

const quiz = {
  title: 'What does your business need?',
  lede: 'Three questions and we tell you where to start.',
  steps: [
    { legend: 'What kind of business do you have?', options: ['Restaurant', 'Gym', 'Local business', 'My own project'] },
    { legend: 'What takes most of your time?', options: ['Messages and orders', 'Bookings and appointments', 'Repeated questions', 'Being found online'] },
    { legend: 'What do you want to achieve?', options: ['Sell more', 'Save time', 'Look professional'] },
  ],
  recs: [[1, 2], [1, 0], [3, 2], [0, 3]],
  resultTitle: 'We recommend starting with:',
  cta: "Let's talk about this idea",
  again: 'Start over',
  message: 'Hi, I have a business ({type}) and what takes most of my time is: {time}. I want to {goal}. I am interested in: {recs}.',
}

const tecnico = {
  heroTitle: 'This is how we build it.',
  heroLede: 'The stack, the method and why each piece is there.',
  stackTitle: 'Tools we know well.',
  stack: [
    ['Web', 'React, Next.js, Astro, Tailwind CSS', 'Fast, search-friendly sites that adapt to any screen.'],
    ['Server and data', 'Python, FastAPI, Node.js, PostgreSQL', 'APIs and databases for bookings, inventory and orders.'],
    ['Artificial intelligence', 'LLMs, RAG, embeddings, pgvector', 'Assistants that answer from your business documents.'],
    ['Mobile and vision', 'Flutter, React Native, OpenCV, YOLO', 'iOS and Android apps and cameras that count objects.'],
  ],
  metodoTitle: 'From problem to working system.',
  metodo: [
    ['Discovery', 'We map the current process and where time is lost.'],
    ['Prototype', 'A minimal version tested with real people.'],
    ['Build', 'Versioned code, tests and small deliveries.'],
    ['Deployment', 'Server, domain, backups and monitoring.'],
    ['Maintenance', 'Fixes, improvements and ongoing support.'],
  ],
  chat: {
    title: 'Sample assistant',
    user: 'Is there a yoga class on Saturday?',
    bot: 'Yes, at 9:00. 3 spots left.',
    source: 'Source: class schedule',
    note: 'Fictional example',
  },
  ragTitle: 'How an assistant learns your business.',
  rag: [
    ['Documents', 'Menu, policies and frequently asked questions.'],
    ['Chunks', 'The text is split into small parts.'],
    ['Embeddings', 'Each part becomes a vector that captures its meaning.'],
    ['pgvector', 'Vectors live in PostgreSQL and are searched by similarity.'],
    ['Answer', 'The model writes only from what it found and cites the source.'],
  ],
  fitcoreTitle: 'FitCore, the architecture in use.',
  fitcoreText: 'The same pieces of this stack working together in a gym demo.',
  fitcoreCta: 'Open the FitCore demo',
  fitcoreItems: [
    ['Web and dashboard', 'Astro and React with Tailwind.'],
    ['API and data', 'Hono on Bun, PostgreSQL and pgvector.'],
    ['Assistant', 'FastAPI and LiteLLM with RAG, answering on WhatsApp.'],
    ['Vision', 'MediaPipe counts people for capacity.'],
    ['Access and jobs', 'Better Auth, Drizzle and a Cloudflare Worker for scheduled tasks.'],
  ],
  fitcoreAlt: ['Public page of the FitCore demo.', 'Sign-in screen of the FitCore dashboard.'],
  fitcoreCredit: 'Screenshots of the FitCore demo. Videos by cottonbro studio and Boris Ivas, Pexels.',
}

const contacto = {
  title: "Let's talk about your business.",
  lede: 'The first conversation is free and no strings attached.',
  messageLabel: 'What would you like to improve in your business?',
}

const ui = {
  skip: 'Skip to content',
  brandLabel: 'Quirelia Studio, home',
  brandAlt: 'Quirelia Studio',
  navLabel: 'Main',
  stageLabel: 'Introduction',
  navSoluciones: 'Solutions',
  navProceso: 'Process',
  navStack: 'Stack',
  navMetodo: 'Method',
  navContacto: 'Contact',
  navCta: "Let's talk",
  heroCta: "Let's talk about your project",
  heroHow: 'How do we do it?',
  heroBack: 'Back to simple',
  mapZoomIn: 'Zoom in on the map',
  mapZoomOut: 'Zoom out of the map',
  mapReset: 'See the whole map',
  fabTecnico: 'See the technical side',
  fabNegocio: 'See the simple version',
  footerLine: 'Quirelia Studio. Technology that connects your business.',
  ragLabel: 'How an assistant with RAG works',
  waLabel: 'Message us on WhatsApp',
  waFallbackLabel: 'Message us',
  waMessage: "Hi, I'd like to talk about my project.",
  mailSubject: 'Project with Quirelia Studio',
  langSwitch: { short: 'ES', label: 'Español', href: '/', hreflang: 'es' },
}

const form = {
  name: 'Your name',
  how: 'Your WhatsApp or email',
  send: 'Send message',
  sending: 'Sending',
  sent: 'We got your message. We will reply soon.',
  errMissing: 'Your name or your message is missing.',
  errContact: 'Enter an email or a WhatsApp number so we can reply.',
  errEndpoint: 'Could not send. Try again or write to us on WhatsApp or by email.',
  errNoChannel: 'This form does not have a sending channel configured yet.',
  nameLine: 'Name',
  contactLine: 'Contact',
}

export const en: Copy = { lang: 'en', ui, form, negocio, tecnico, quiz, contacto }
