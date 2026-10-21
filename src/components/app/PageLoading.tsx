import { Skeleton } from '@/components/ui/skeleton'

/** Full-page placeholder while the app starts (sign-in, first lazy page). */
export function PageLoading({ label }: { label: string }) {
  return (
    <main role="status" className="flex min-h-svh flex-col items-center justify-center gap-3 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-32" />
      <span className="sr-only">{label}</span>
    </main>
  )
}
