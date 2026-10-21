import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { isLanguage, languages, type Language } from '@/i18n/resources'

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const current: Language = isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'pl'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-label={t('common.language.trigger', {
            code: current.toUpperCase(),
            name: t(`common.language.${current}`),
          })}
        >
          <Languages aria-hidden />
          <span>{current.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('common.language.label')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={current}
          onValueChange={(value) => isLanguage(value) && void i18n.changeLanguage(value)}
        >
          {languages.map((language) => (
            <DropdownMenuRadioItem key={language} value={language} lang={language}>
              {t(`common.language.${language}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
