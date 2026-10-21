import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import '@/i18n'
import { setAccessTokenGetter, setUnauthorizedHandler } from '@/api/fetcher'
import { queryClient } from '@/api/queryClient'
import { AuthProvider } from '@/auth'
import { getAccessToken, login } from '@/auth/userManager'
import { ThemeProvider } from '@/components/app/theme/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import { router } from '@/router'
import '@/index.css'

setAccessTokenGetter(getAccessToken)
setUnauthorizedHandler(() => void login().catch(() => {}))

const navigateAfterLogin = (to: string) => void router.navigate(to, { replace: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider navigate={navigateAfterLogin}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RouterProvider router={router} />
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  </StrictMode>,
)
