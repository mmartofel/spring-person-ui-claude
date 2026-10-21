import { useId } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFormat } from '@/i18n/format'

interface PaginationProps {
  /** 0-based page from the URL. */
  page: number
  size: number
  pageSizes: number[]
  totalElements: number
  totalPages: number
  onPageChange: (page: number) => void
  onSizeChange: (size: number) => void
}

export function Pagination({ page, size, pageSizes, totalElements, totalPages, onPageChange, onSizeChange }: PaginationProps) {
  const { t } = useTranslation()
  const format = useFormat()
  const sizeId = useId()

  const from = totalElements === 0 ? 0 : page * size + 1
  const to = Math.min((page + 1) * size, totalElements)

  return (
    <nav
      aria-label={t('common.list.pagination')}
      className="flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between"
    >
      <div className="flex items-center gap-2 text-sm">
        <label htmlFor={sizeId} className="text-muted-foreground">
          {t('common.list.rowsPerPage')}
        </label>
        <Select value={String(size)} onValueChange={(value) => onSizeChange(Number(value))}>
          <SelectTrigger id={sizeId} className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizes.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {format.number(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t('common.list.range', {
            from: format.number(from),
            to: format.number(to),
            total: format.number(totalElements),
          })}
        </p>
        <Button
          variant="outline"
          size="icon"
          aria-label={t('common.list.previous')}
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label={t('common.list.next')}
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </nav>
  )
}
