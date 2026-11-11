import { createContext, useContext } from 'react'
import { es, type Copy } from './content'

/** The page copy for the current language. App provides it; components read it with useCopy. */
export const CopyContext = createContext<Copy>(es)
export const useCopy = () => useContext(CopyContext)
