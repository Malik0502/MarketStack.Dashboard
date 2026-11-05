import { createContext } from 'react'

export type CardHeading = 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
export const CardHeadingContext = createContext<CardHeading>('h2')
