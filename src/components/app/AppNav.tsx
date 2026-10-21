import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'
import { useRoles } from '@/auth'
import { canRead, resources } from '@/manifest'
import { getIcon } from '@/manifest/icons'

/** Navigation built from ui-manifest.yaml: the resources the user can read, in `nav.order`. */
export function AppNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()
  const roles = useRoles()
  const items = resources.filter((resource) => canRead(roles, resource))

  return (
    <nav aria-label={t('common.nav.label')}>
      <ul className="flex flex-col gap-1">
        {items.map((resource) => {
          const Icon = getIcon(resource.nav.icon)
          return (
            <li key={resource.key}>
              <NavLink
                to={resource.route}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-11 items-center gap-3 rounded-md border-l-4 border-transparent px-3 text-sm font-medium',
                    'hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none',
                    isActive && 'border-primary bg-accent font-semibold text-accent-foreground',
                  )
                }
              >
                <Icon className="size-4" aria-hidden />
                {t(`${resource.key}.title`)}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
