import { createContext } from 'react'

export const PageContext = createContext<(title: string) => void>(() => {})
