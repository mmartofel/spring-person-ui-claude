import { useMemo, useState, type ComponentProps, type Ref } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { countryName, countryOptions } from '@/lib/countries'
import { cn } from '@/lib/utils'

type TriggerProps = Omit<ComponentProps<'button'>, 'value' | 'onChange' | 'ref'>

interface CountrySelectProps extends TriggerProps {
  /** ISO 3166-1 alpha-2 code, '' for none. */
  value: string
  onChange: (code: string) => void
  /** Offers an option that clears the value. */
  allowEmpty?: boolean
  /** Text for no value (placeholder and the clearing option); defaults to "Choose a country" / "— none —". */
  emptyLabel?: string
  ref?: Ref<HTMLButtonElement>
}

/** A searchable country picker: codes are stored, names come from Intl.DisplayNames in the current language. */
export function CountrySelect({ value, onChange, allowEmpty, emptyLabel, ref, className, ...trigger }: CountrySelectProps) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language
  const [open, setOpen] = useState(false)
  const options = useMemo(() => countryOptions(language), [language])

  const select = (code: string) => {
    onChange(code)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
          <span className="truncate">
            {value ? countryName(value, language) : (emptyLabel ?? t('common.form.chooseCountry'))}
          </span>
          <ChevronsUpDown aria-hidden className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) min-w-64 p-0"
        align="start"
        aria-label={t('common.form.countries')}
      >
        {/* Starts on the current value; matches anywhere in the name or code, ignoring case and accents. */}
        <Command
          label={t('common.form.countries')}
          defaultValue={value ? countryName(value, language) : undefined}
          filter={(itemValue, search, keywords) =>
            normalize([itemValue, ...(keywords ?? [])].join(' ')).includes(normalize(search)) ? 1 : 0
          }
        >
          <CommandInput placeholder={t('common.form.searchCountry')} aria-label={t('common.form.searchCountry')} />
          {/* cmdk names the list "Suggestions" unless told otherwise. */}
          <CommandList label={t('common.form.countries')}>
            <CommandEmpty>{t('common.form.noCountry')}</CommandEmpty>
            <CommandGroup>
              {allowEmpty && (
                <CommandItem value={emptyLabel ?? t('common.form.none')} onSelect={() => select('')}>
                  <Check aria-hidden className={cn(value ? 'opacity-0' : 'opacity-100')} />
                  {emptyLabel ?? t('common.form.none')}
                </CommandItem>
              )}
              {options.map(({ code, name }) => (
                // cmdk filters by `value` and `keywords`: the name in the current language and the code.
                <CommandItem key={code} value={name} keywords={[code]} onSelect={() => select(code)}>
                  <Check aria-hidden className={cn(value === code ? 'opacity-100' : 'opacity-0')} />
                  {name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
