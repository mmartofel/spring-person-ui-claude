import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from 'react-oidc-context'
import { useLocation } from 'react-router'
import { LogIn } from 'lucide-react'
import { ErrorPage } from '@/components/app/ErrorPage'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { login } from './userManager'

/** True while the router is still on the Keycloak callback URL (`/?code=…&state=…`). */
function isSigninCallback(search: string) {
  const params = new URLSearchParams(search)
  return (params.has('code') || params.has('error')) && params.has('state')
}

/** Renders children only for a signed-in user; otherwise starts the Keycloak login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const auth = useAuth()
  const { search } = useLocation()
  const [loginFailed, setLoginFailed] = useState(false)
  const shouldLogin = !auth.isLoading && !auth.isAuthenticated && !auth.activeNavigator && !auth.error

  useEffect(() => {
    if (shouldLogin) login().catch(() => setLoginFailed(true))
  }, [shouldLogin])

  if (auth.error || loginFailed) {
    return (
      <main>
        <ErrorPage
          icon={LogIn}
        title={t('common.auth.errorTitle')}
        description={t('common.auth.errorText')}
          action={
            <Button onClick={() => login().catch(() => setLoginFailed(true))}>{t('common.auth.signInAgain')}</Button>
          }
        />
      </main>
    )
  }

  // After the callback the router navigates to the original URL in a transition; until it lands,
  // rendering the routes would let `/` redirect away and lose the original URL.
  if (!auth.isAuthenticated || isSigninCallback(search)) {
    return (
      <main role="status" className="flex min-h-svh flex-col items-center justify-center gap-3 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <span className="sr-only">{t('common.auth.signingIn')}</span>
      </main>
    )
  }

  return children
}
