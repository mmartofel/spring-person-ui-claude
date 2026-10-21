import { useId, type ReactNode } from 'react'
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { enumLabelKey, fieldLabelKey, tDynamic } from '@/i18n/dynamic'
import { cn } from '@/lib/utils'
import type { Resource } from '@/manifest'

// Radix Select cannot use '' as an item value; this stands for "no value" in the UI only.
const NONE = '__none__'

const groupColumns: Record<number, string> = { 1: '', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' }

interface FormFieldsProps<T extends FieldValues, TOut extends FieldValues> {
  resource: Resource
  control: Control<T, unknown, TOut>
  /** Fields the schema requires (see `isRequired`). */
  required: readonly string[]
  /** Allowed values of each enum field, from the generated model (e.g. `Object.values(PersonCreateRequestGender)`). */
  enumValues?: Record<string, readonly string[]>
}

/** All form fields of a resource, laid out by the manifest's `form.groups`: one column on mobile, a row from `md`. */
export function FormFields<T extends FieldValues, TOut extends FieldValues = T>({
  resource,
  control,
  required,
  enumValues = {},
}: FormFieldsProps<T, TOut>) {
  return (
    <div className="flex flex-col gap-5">
      {resource.form.groups.map((group) => (
        <div key={group.join()} className={cn('grid gap-5', groupColumns[group.length])}>
          {group.map((field) => (
            <FormField
              key={field}
              resource={resource}
              name={field as Path<T>}
              control={control}
              required={required.includes(field)}
              options={enumValues[field]}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

interface FormFieldProps<T extends FieldValues, TOut extends FieldValues> {
  resource: Resource
  name: Path<T>
  control: Control<T, unknown, TOut>
  required: boolean
  options?: readonly string[]
}

function FormField<T extends FieldValues, TOut extends FieldValues>({
  resource,
  name,
  control,
  required,
  options = [],
}: FormFieldProps<T, TOut>) {
  const { t } = useTranslation()
  const id = useId()
  const errorId = `${id}-error`
  // Destructured: the React Compiler lint treats the whole `field` object as a ref because it carries `ref`.
  const {
    field: { ref, value, onChange, onBlur, name: inputName },
    fieldState,
  } = useController({ name, control })
  const config = resource.form.fields?.[name] ?? { input: 'text' as const }
  const invalid = !!fieldState.error
  const a11y = {
    id,
    'aria-invalid': invalid || undefined,
    'aria-required': required || undefined,
    'aria-describedby': invalid ? errorId : undefined,
  }

  let input: ReactNode
  if (config.input === 'select') {
    input = (
      <Select
        value={value || (config.allowEmpty ? NONE : '')}
        onValueChange={(next) => onChange(next === NONE ? '' : next)}
      >
        <SelectTrigger {...a11y} ref={ref} onBlur={onBlur} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {config.allowEmpty && <SelectItem value={NONE}>{t('common.form.none')}</SelectItem>}
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {config.enum ? tDynamic(t, enumLabelKey(config.enum, option)) : option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  } else {
    input = (
      <Input
        {...a11y}
        ref={ref}
        name={inputName}
        value={value ?? ''}
        onChange={onChange}
        onBlur={onBlur}
        type={config.input === 'date' ? 'date' : 'text'}
      />
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>
        {tDynamic(t, fieldLabelKey(resource.key, name))}
        {required && (
          <>
            <span aria-hidden className="text-destructive">
              *
            </span>
            <span className="sr-only">({t('common.form.required')})</span>
          </>
        )}
      </Label>
      {input}
      {fieldState.error?.message && (
        <p id={errorId} className="text-sm text-destructive">
          {fieldState.error.message}
        </p>
      )}
    </div>
  )
}
