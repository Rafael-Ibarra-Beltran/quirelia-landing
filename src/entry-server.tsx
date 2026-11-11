import { renderToString } from 'react-dom/server'
import { StrictMode } from 'react'
import App from './App'

export const render = (lang: 'es' | 'en') => renderToString(<StrictMode><App lang={lang} /></StrictMode>)
