import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'
import AppErrorFallback from './components/errors/AppErrorFallback.tsx'
import { initializeSentry } from './lib/sentry.ts'

const queryClient = new QueryClient()
initializeSentry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<AppErrorFallback />}>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
