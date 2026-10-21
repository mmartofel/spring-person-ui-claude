import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet } from 'react-router'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { AppNav } from './AppNav'
import { ErrorBoundary } from './ErrorBoundary'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'

/** Header plus navigation: a sidebar from `lg`, a sheet menu below it. */
export function AppShell() {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-svh">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-background px-4 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:ring-[3px] focus:ring-ring"
      >
        {t('common.skipToContent')}
      </a>

      <header className="sticky top-0 z-40 flex h-14 items-center gap-1 border-b bg-background px-2 sm:px-4">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t('common.nav.openMenu')}>
              <Menu aria-hidden />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 gap-0 p-0" showCloseButton={false} aria-describedby={undefined}>
            <SheetHeader className="flex-row items-center justify-between border-b px-4 py-2">
              <SheetTitle>{t('common.nav.label')}</SheetTitle>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" aria-label={t('common.nav.closeMenu')}>
                  <X aria-hidden />
                </Button>
              </SheetClose>
            </SheetHeader>
            <div className="p-3">
              <AppNav onNavigate={() => setMenuOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <Link
          to="/"
          className="flex min-h-11 items-center rounded-md px-2 font-semibold tracking-tight focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
        >
          {t('common.appName')}
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="sticky top-14 hidden h-[calc(100svh-3.5rem)] overflow-y-auto border-r p-3 lg:block">
          <AppNav />
        </aside>
        <main id="main" tabIndex={-1} className="min-w-0 px-4 py-6 outline-none md:px-6 lg:px-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
