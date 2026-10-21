import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useDocumentTitle } from './useDocumentTitle'

interface ErrorPageProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

/** Shared layout of the 403, 404, error-boundary and sign-in error pages. */
export function ErrorPage({ icon: Icon, title, description, action }: ErrorPageProps) {
  useDocumentTitle(title)
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <Icon className="size-12 text-muted-foreground" aria-hidden />
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
      {action}
    </div>
  )
}
