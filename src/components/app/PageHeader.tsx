import type { ReactNode } from 'react'
import { useDocumentTitle } from './useDocumentTitle'

interface PageHeaderProps {
  title: string
  description?: string
  /** Page actions (buttons); they wrap below the title on small screens. */
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  useDocumentTitle(title)
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight break-words">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
