import { Skeleton } from '@/components/ui/skeleton'

/** Loading placeholder shaped like DataTable: table rows from `md`, cards below. */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      <div className="hidden space-y-2 md:block">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
      <div className="space-y-2 md:hidden">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </>
  )
}
