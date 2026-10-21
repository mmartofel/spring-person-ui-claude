import { UserManager, WebStorageStateStore } from 'oidc-client-ts'
import i18n from '@/i18n'
import { returnToFromLocation } from './returnTo'

function requireEnv(name: 'VITE_OIDC_AUTHORITY' | 'VITE_OIDC_CLIENT_ID'): string {
  const value = import.meta.env[name]
  if (!value) throw new Error(`${name} is not set: copy .env.example to .env.local (see README).`)
  return value
}

// The one OIDC client of the app (Keycloak, Authorization Code + PKCE).
export const userManager = new UserManager({
  authority: requireEnv('VITE_OIDC_AUTHORITY'),
  client_id: requireEnv('VITE_OIDC_CLIENT_ID'),
  redirect_uri: `${window.location.origin}/`,
  post_logout_redirect_uri: `${window.location.origin}/`,
  scope: 'openid profile email',
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
})

export interface LoginState {
  returnTo: string
}

let redirecting = false

/**
 * Redirects to Keycloak in the current UI language; after login the app returns to `returnTo`.
 * Rejects when the redirect cannot start (for example Keycloak is unreachable).
 */
export async function login(returnTo = returnToFromLocation(window.location)): Promise<void> {
  if (redirecting) return
  redirecting = true
  const state: LoginState = { returnTo }
  try {
    await userManager.signinRedirect({ state, ui_locales: i18n.language })
  } catch (error) {
    redirecting = false
    console.error('Login redirect failed', error)
    throw error
  }
}

export async function getAccessToken(): Promise<string | undefined> {
  const user = await userManager.getUser()
  return user && !user.expired ? user.access_token : undefined
}
