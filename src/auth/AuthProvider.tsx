import { useCallback, type ReactNode } from 'react'
import { AuthProvider as OidcAuthProvider } from 'react-oidc-context'
import { useNavigate } from 'react-router'
import type { User } from 'oidc-client-ts'
import { safeReturnTo } from './returnTo'
import { userManager, type LoginState } from './userManager'

/** Must be rendered inside the router: after the login callback it navigates back to the original URL. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const onSigninCallback = useCallback(
    (user: User | undefined) => {
      const state = user?.state as LoginState | undefined
      navigate(safeReturnTo(state?.returnTo), { replace: true })
    },
    [navigate],
  )

  return (
    <OidcAuthProvider userManager={userManager} onSigninCallback={onSigninCallback}>
      {children}
    </OidcAuthProvider>
  )
}
