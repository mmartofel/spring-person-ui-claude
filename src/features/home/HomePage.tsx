import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

// Placeholder until the app shell and i18n arrive in stage 3.
export function HomePage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-start justify-center gap-4 px-4">
      <h1 className="text-3xl font-semibold tracking-tight">Person UI</h1>
      <p className="text-muted-foreground">
        Scaffold is running. Screens arrive in the next stages.
      </p>
      <Button asChild size="lg" className="min-h-11">
        <Link to="/persons">Persons</Link>
      </Button>
    </main>
  )
}
