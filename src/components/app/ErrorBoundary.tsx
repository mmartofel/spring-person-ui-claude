import { Component, type ErrorInfo, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { ErrorPage } from './ErrorPage'

interface BoundaryProps {
  resetKey: string
  children: ReactNode
}

class Boundary extends Component<BoundaryProps, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  componentDidUpdate(prev: BoundaryProps) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  render() {
    return this.state.error ? <Fallback onReset={() => this.setState({ error: null })} /> : this.props.children
  }
}

function Fallback({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation()
  return (
    <ErrorPage
      icon={TriangleAlert}
      title={t('common.errors.unexpectedTitle')}
      description={t('common.errors.unexpectedText')}
      action={<Button onClick={onReset}>{t('common.errors.tryAgain')}</Button>}
    />
  )
}

/** Catches render errors of a page; navigating to another route clears the error. */
export function ErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return <Boundary resetKey={pathname}>{children}</Boundary>
}
