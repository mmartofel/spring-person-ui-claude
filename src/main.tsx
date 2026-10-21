import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router'
import '@/i18n'
import App from '@/App'
import { setAccessTokenGetter, setUnauthorizedHandler } from '@/api/fetcher'
import { queryClient } from '@/api/queryClient'
import { AuthProvider } from '@/auth'
import { getAccessToken, login } from '@/auth/userManager'
import { ThemeProvider } from '@/components/app/theme/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import '@/index.css'

setAccessTokenGetter(getAccessToken)
setUnauthorizedHandler(() => void login().catch(() => {}))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <App />
            <Toaster />
          </ThemeProvider>
        </QueryClientProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
