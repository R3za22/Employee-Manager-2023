import '@fontsource/ibm-plex-sans/latin-400.css'
import '@fontsource/ibm-plex-sans/latin-500.css'
import '@fontsource/ibm-plex-sans/latin-600.css'
import '@fontsource/vazirmatn/arabic-400.css'
import '@fontsource/vazirmatn/arabic-500.css'
import '@fontsource/vazirmatn/arabic-600.css'
import './styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from './routes'
import { DataProvider, ToastProvider } from './app'
import { LocaleProvider } from './i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocaleProvider>
      <DataProvider>
        <ToastProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </ToastProvider>
      </DataProvider>
    </LocaleProvider>
  </StrictMode>,
)
