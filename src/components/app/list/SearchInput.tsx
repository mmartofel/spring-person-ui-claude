import { useEffect, useId, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const DEBOUNCE_MS = 300

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
}

/** Search box bound to the list `q` param; changes are debounced, and Back/Forward updates the text. */
export function SearchInput({ value, onChange }: SearchInputProps) {
  const { t } = useTranslation()
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState(value)
  const [lastValue, setLastValue] = useState(value)

  // The URL changed from outside (Back/Forward, a link): show its value.
  if (value !== lastValue) {
    setLastValue(value)
    setText(value)
  }

  useEffect(() => {
    if (text.trim() === value) return
    const timer = setTimeout(() => onChange(text), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [text, value, onChange])

  return (
    <div role="search" className="relative w-full sm:max-w-sm">
      <label htmlFor={id} className="sr-only">
        {t('common.list.search')}
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        ref={inputRef}
        id={id}
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={t('common.list.searchPlaceholder')}
        className="pr-11 pl-9 [&::-webkit-search-cancel-button]:hidden"
        autoComplete="off"
      />
      {text && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-1/2 right-0 -translate-y-1/2"
          aria-label={t('common.list.clearSearch')}
          onClick={() => {
            setText('')
            onChange('')
            inputRef.current?.focus()
          }}
        >
          <X aria-hidden />
        </Button>
      )}
    </div>
  )
}
