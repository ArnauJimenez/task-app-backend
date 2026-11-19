import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.js'
import { SentryTestButton } from './components/SentryTestButton.js'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<div role="alert">An unexpected error occurred.</div>}>
      <App />
    </Sentry.ErrorBoundary>
    {(import.meta.env.DEV || import.meta.env.VITE_SENTRY_TEST_BUTTON === 'true') && (
      <Sentry.ErrorBoundary fallback={<div role="status">Test error sent to Sentry.</div>}>
        <SentryTestButton />
      </Sentry.ErrorBoundary>
    )}
  </StrictMode>,
)
