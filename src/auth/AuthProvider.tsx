import { useCallback, type ReactNode } from 'react'
import { AuthProvider as OidcAuthProvider } from 'react-oidc-context'
import type { User } from 'oidc-client-ts'
import { safeReturnTo } from './returnTo'
import { userManager, type LoginState } from './userManager'

interface AuthProviderProps {
  /** Replaces the callback URL with the URL the user wanted before login. */
  navigate: (to: string) => void
  children: ReactNode
}

export function AuthProvider({ navigate, children }: AuthProviderProps) {
  const onSigninCallback = useCallback(
    (user: User | undefined) => {
      const state = user?.state as LoginState | undefined
      navigate(safeReturnTo(state?.returnTo))
    },
    [navigate],
  )

  return (
    <OidcAuthProvider userManager={userManager} onSigninCallback={onSigninCallback}>
      {children}
    </OidcAuthProvider>
  )
}
