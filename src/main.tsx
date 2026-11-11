import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import '@fontsource-variable/sora'
import '@fontsource-variable/dm-sans'
import '@fontsource/jetbrains-mono/400.css'
import './styles/app.css'
import App from './App'

const root = document.getElementById('root')!
const lang = document.documentElement.lang === 'en' ? 'en' : 'es'
// The build prerenders the page; hydrate when markup exists, render fresh under `vite dev`.
if (root.firstElementChild) hydrateRoot(root, <StrictMode><App lang={lang} /></StrictMode>)
else createRoot(root).render(<StrictMode><App lang={lang} /></StrictMode>)
