import { CircleUser, LogOut } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuth, useRoles } from '@/auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { resources } from '@/manifest'

// Only roles the manifest knows are shown (Keycloak adds technical ones such as offline_access);
// each one needs a `common.roles.<role>` label.
const appRoles = new Set(resources.flatMap((r) => [...r.permissions.read, ...r.permissions.write]))
type AppRole = keyof typeof import('@/locales/en/common.json')['roles']

export function UserMenu() {
  const { t } = useTranslation()
  const auth = useAuth()
  const queryClient = useQueryClient()
  const roles = useRoles().filter((role) => appRoles.has(role))
  const profile = auth.user?.profile
  const name = profile?.name ?? profile?.preferred_username ?? ''

  const logout = () => {
    queryClient.clear()
    void auth.signoutRedirect()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="min-w-11"
          aria-label={name ? t('common.user.menuWithName', { name }) : t('common.user.menu')}
        >
          <CircleUser aria-hidden />
          <span className="hidden max-w-40 truncate md:inline">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate font-medium">{name}</div>
          {profile?.email && <div className="truncate text-xs text-muted-foreground">{profile.email}</div>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="font-normal">
          <div className="text-xs text-muted-foreground">{t('common.user.roles')}</div>
          <div className="text-sm">{roles.length
              ? roles.map((role) => t(`common.roles.${role as AppRole}`)).join(', ')
              : t('common.user.noRoles')}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout}>
          <LogOut aria-hidden />
          {t('common.user.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
