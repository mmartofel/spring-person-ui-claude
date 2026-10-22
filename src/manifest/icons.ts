import { CircleHelp, ListChecks, Users, type LucideIcon } from 'lucide-react'

// Icon names used by `nav.icon` in ui-manifest.yaml. Add an entry when a resource uses a new icon.
const icons: Record<string, LucideIcon> = {
  users: Users,
  'list-checks': ListChecks,
}

export function getIcon(name: string): LucideIcon {
  return icons[name] ?? CircleHelp
}
