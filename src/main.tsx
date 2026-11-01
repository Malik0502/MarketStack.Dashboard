import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n'
import { ThemeProvider } from './theme/theme-provider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <ThemeProvider><App /></ThemeProvider>
    </I18nextProvider>
  </StrictMode>,
)
