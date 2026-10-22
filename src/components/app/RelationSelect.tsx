import { useEffect, useState, type ComponentProps, type Ref } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { sources } from '@/api/sources'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { formatDisplay, getResource, type ResourceKey } from '@/manifest'

const DEBOUNCE_MS = 300
const PAGE_SIZE = 20
// cmdk needs a non-empty item value; ids are numeric, so this cannot collide.
const NONE = '__none__'

type TriggerProps = Omit<ComponentProps<'button'>, 'value' | 'onChange' | 'ref'>

interface RelationSelectProps extends TriggerProps {
  /** The related resource (manifest key); its list endpoint is searched with `q`. */
  resource: ResourceKey
  /** The related record's id as a string, '' for none. */
  value: string
  onChange: (id: string) => void
  /** The selected record's name when it is already known (an embedded reference); otherwise it is loaded by id. */
  label?: string
  /** Offers an option that clears the value. */
  allowEmpty?: boolean
  /** Text for no value (placeholder and the clearing option); defaults to "Choose…" / "— none —". */
  emptyLabel?: string
  ref?: Ref<HTMLButtonElement>
}

/** A searchable picker for a record of another resource, named by that resource's `display`. */
export function RelationSelect({
  resource,
  value,
  onChange,
  label,
  allowEmpty,
  emptyLabel,
  ref,
  className,
  ...trigger
}: RelationSelectProps) {
  const { t } = useTranslation()
  const related = getResource(resource)
  const source = sources[resource]
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  // The name picked in this session; the `label` prop covers the record's initial value.
  const [picked, setPicked] = useState<{ id: string; name: string }>()
  // The highlighted item. Results change under it while typing, so a highlight that is gone falls back to the first
  // item: Enter after a search then picks the first match.
  const [active, setActive] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setQ(search.trim()), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [search])

  const params = { q: q || undefined, size: PAGE_SIZE, sort: [related.list.defaultSort] }
  const options = useQuery({
    queryKey: source.listKey(params),
    queryFn: () => source.list(params),
    enabled: open,
    placeholderData: keepPreviousData,
  })
  const knownName = picked?.id === value ? picked.name : label
  const selected = useQuery({
    queryKey: [...source.listKey({}), 'label', value],
    queryFn: () => source.get(Number(value)),
    enabled: !!value && !knownName,
  })
  const name =
    knownName ??
    (selected.data
      ? formatDisplay(related.display, selected.data)
      : selected.isError
        ? t('common.form.unknownRecord')
        : t('common.form.loadingRecords'))
  const records = options.data?.content ?? []
  const showNone = allowEmpty && !search.trim()
  // While the typed search has not been sent or answered, nothing is highlighted: Enter must not pick a stale result.
  const pending = search.trim() !== q || (options.isFetching && options.isPlaceholderData)
  const itemValues = [...(showNone ? [NONE] : []), ...records.map((record) => String(record.id))]
  const highlighted = pending ? '' : itemValues.includes(active) ? active : (itemValues[0] ?? '')

  const close = () => {
    setOpen(false)
    setSearch('')
    setQ('')
  }

  const select = (id: string, recordName = '') => {
    setPicked({ id, name: recordName })
    onChange(id)
    close()
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
    >
      <PopoverTrigger asChild>
        <Button
          {...trigger}
          ref={ref}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground', className)}
        >
          <span className="truncate">{value ? name : (emptyLabel ?? t('common.form.chooseRecord'))}</span>
          <ChevronsUpDown aria-hidden className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) min-w-64 p-0"
        align="start"
        aria-label={t(`${resource}.title`)}
      >
        {/* The API searches (`q`), so cmdk does not filter. */}
        <Command shouldFilter={false} label={t(`${resource}.title`)} value={highlighted} onValueChange={setActive}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={t('common.form.searchRecords')}
            aria-label={t('common.form.searchRecords')}
          />
          <CommandList label={t(`${resource}.title`)} aria-busy={options.isFetching}>
            {options.isPending ? (
              <div className="py-6 text-center text-sm text-muted-foreground">{t('common.form.loadingRecords')}</div>
            ) : (
              <CommandEmpty>{t('common.form.noRecords')}</CommandEmpty>
            )}
            <CommandGroup>
              {showNone && (
                <CommandItem value={NONE} onSelect={() => select('')}>
                  <Check aria-hidden className={cn(value ? 'opacity-0' : 'opacity-100')} />
                  {emptyLabel ?? t('common.form.none')}
                </CommandItem>
              )}
              {records.map((record) => {
                const recordName = formatDisplay(related.display, record)
                const id = String(record.id)
                return (
                  <CommandItem key={id} value={id} onSelect={() => select(id, recordName)}>
                    <Check aria-hidden className={cn(value === id ? 'opacity-100' : 'opacity-0')} />
                    {recordName}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
