import { useId, useRef } from 'react'
import { ListFilter, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CountrySelect } from '@/components/app/CountrySelect'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { enumLabelKey, filterLabelKey, tDynamic } from '@/i18n/dynamic'
import { cn } from '@/lib/utils'
import type { FilterManifest, Resource } from '@/manifest'

// Radix Select cannot use '' as an item value; this stands for "any value" in the UI only.
const ANY = '__any__'

interface ListFiltersProps {
  resource: Resource
  /** The set filters, by query param (from `useListState`). */
  values: Record<string, string>
  /** Sets one filter; '' clears it. */
  onChange: (param: string, value: string) => void
  onClear: () => void
  /** Allowed values of each select filter, from the generated model (e.g. `Object.values(ListPersonsStatus)`). */
  enumValues?: Record<string, readonly string[]>
}

/** The manifest's `list.filters`: a row of inputs from `md`, a "Filters" button opening a sheet below it. */
export function ListFilters({ resource, values, onChange, onClear, enumValues = {} }: ListFiltersProps) {
  const { t } = useTranslation()
  const groupRef = useRef<HTMLDivElement>(null)
  const filters = resource.list.filters ?? []
  const active = filters.filter(({ param }) => values[param]).length
  if (filters.length === 0) return null

  const fields = (className: string) =>
    filters.map((filter) => (
      <FilterField
        key={filter.param}
        resource={resource}
        filter={filter}
        value={values[filter.param] ?? ''}
        onChange={(value) => onChange(filter.param, value)}
        options={enumValues[filter.param]}
        className={className}
      />
    ))
  // The button disappears once nothing is set: keep keyboard focus on the first filter of the visible row.
  const clearAndFocus = () => {
    onClear()
    groupRef.current?.querySelector<HTMLElement>('button, input')?.focus()
  }
  const clear = active > 0 && (
    <Button type="button" variant="ghost" onClick={clearAndFocus}>
      <X aria-hidden />
      {t('common.list.clearFilters')}
    </Button>
  )

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button type="button" variant="outline" className="md:hidden">
            <ListFilter aria-hidden />
            {t('common.list.filters')}
            {active > 0 && (
              <Badge variant="secondary" className="ml-1">
                <span aria-hidden>{active}</span>
                <span className="sr-only">{t('common.list.filtersActive', { count: active })}</span>
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] gap-0 overflow-y-auto p-0"
          showCloseButton={false}
          aria-describedby={undefined}
        >
          <SheetHeader className="flex-row items-center justify-between border-b px-4 py-2">
            <SheetTitle>{t('common.list.filters')}</SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" aria-label={t('common.list.closeFilters')}>
                <X aria-hidden />
              </Button>
            </SheetClose>
          </SheetHeader>
          <div className="flex flex-col gap-4 p-4">{fields('w-full')}</div>
          {clear && <SheetFooter className="border-t px-4 py-3">{clear}</SheetFooter>}
        </SheetContent>
      </Sheet>
      <div
        ref={groupRef}
        role="group"
        aria-label={t('common.list.filters')}
        className="hidden w-full flex-wrap items-end gap-3 md:flex"
      >
        {fields('w-44')}
        {clear}
      </div>
    </>
  )
}

interface FilterFieldProps {
  resource: Resource
  filter: FilterManifest
  value: string
  onChange: (value: string) => void
  options?: readonly string[]
  className: string
}

function FilterField({ resource, filter, value, onChange, options = [], className }: FilterFieldProps) {
  const { t } = useTranslation()
  const id = useId()

  let input
  if (filter.input === 'select') {
    input = (
      <Select value={value || ANY} onValueChange={(next) => onChange(next === ANY ? '' : next)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{t('common.list.filterAny')}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {filter.enum ? tDynamic(t, enumLabelKey(filter.enum, option)) : option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  } else if (filter.input === 'country') {
    input = (
      <CountrySelect id={id} value={value} onChange={onChange} allowEmpty emptyLabel={t('common.list.filterAny')} />
    )
  } else {
    input = <Input id={id} type="date" value={value} onChange={(event) => onChange(event.target.value)} />
  }

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <Label htmlFor={id}>{tDynamic(t, filterLabelKey(resource.key, filter.param))}</Label>
      {input}
    </div>
  )
}
