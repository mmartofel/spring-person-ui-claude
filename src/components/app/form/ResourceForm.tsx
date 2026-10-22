import { useEffect, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { useForm, type FieldErrors, type FieldValues, type Path } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import type { z } from 'zod'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { fieldLabelKey, tDynamic } from '@/i18n/dynamic'
import { formatDisplay, formFieldPaths, getPath, type Resource } from '@/manifest'
import { renderFieldValue } from '../formatValue'
import { ConfirmDialog } from '../ConfirmDialog'
import { applyApiError, retranslateServerError } from './applyApiError'
import { FormFields } from './FormFields'
import { defaultValue, formResolver, isRequired, numberLimits, type NotBeforeRule } from './formResolver'
import { UnsavedChangesGuard } from './UnsavedChangesGuard'

/** A record as the API returns it: every editable resource has an id and an optimistic-locking version. */
export interface VersionedRecord {
  id: number
  version: number
}

/** Form state: strings by field, nested objects for nested fields (`address.city`). */
type FormValues = Record<string, unknown>

/**
 * Form state holds strings ('' means "no value") and booleans for checkboxes. Each field path comes from the record,
 * or for a new record from the schema's default (a contract `default`).
 */
function toFormValues(
  paths: readonly string[],
  source: (path: string) => unknown,
  isCheckbox: (path: string) => boolean,
): FormValues {
  const values: FormValues = {}
  for (const path of paths) {
    const keys = path.split('.')
    const parent = keys.slice(0, -1).reduce((node, key) => (node[key] ??= {}) as FormValues, values)
    const value = source(path)
    parent[keys.at(-1)!] = isCheckbox(path) ? value === true : value == null ? '' : String(value)
  }
  return values
}

/** Field errors by path; a nested object's errors are reported under each of its fields. */
function errorsByPath(errors: FieldErrors, prefix = ''): [string, FieldErrors[string]][] {
  return Object.entries(errors).flatMap(([key, error]) => {
    const path = prefix ? `${prefix}.${key}` : key
    if (!error) return []
    return 'type' in error && typeof error.type === 'string'
      ? [[path, error] as [string, FieldErrors[string]]]
      : errorsByPath(error as FieldErrors, path)
  })
}

interface ResourceFormProps<TRecord extends VersionedRecord, TSchema extends z.ZodObject> {
  resource: Resource
  /** Generated body schema without `version` (e.g. `CreatePersonBody`, `UpdatePersonBody.omit({ version: true })`). */
  schema: TSchema
  /** The record to edit; absent when creating. */
  record?: TRecord
  /** Allowed values of each enum field, from the generated model. */
  enumValues?: Record<string, readonly string[]>
  /** Creates, or (with `version`) replaces the record; resolves with the saved record. */
  save: (body: z.output<TSchema>, version?: number) => Promise<TRecord>
  /** Called after a successful save, e.g. to update the query cache. */
  onSaved: (saved: TRecord) => void
  /** Loads the latest version after a stale-version conflict. */
  reload?: () => Promise<TRecord | undefined>
  cancelHref: string
}

/**
 * Create/edit form of a resource: manifest fields, validation with the generated schema, server errors on fields,
 * stale-version reload, unsaved-changes guard, success toast and navigation to the detail page.
 */
export function ResourceForm<TRecord extends VersionedRecord, TSchema extends z.ZodObject>({
  resource,
  schema,
  record,
  enumValues,
  save,
  onSaved,
  reload,
  cancelHref,
}: ResourceFormProps<TRecord, TSchema>) {
  type Body = z.output<TSchema> & FieldValues
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language
  const navigate = useNavigate()
  const fields = formFieldPaths(resource)
  const required = fields.filter((field) => isRequired(schema, field))
  const rules: NotBeforeRule[] = Object.entries(resource.form.fields ?? {}).flatMap(([field, config]) =>
    config.notBefore ? [{ field, notBefore: config.notBefore }] : [],
  )
  const inputs = resource.form.fields ?? {}
  // A relation input starts from the record's embedded reference (`from: assignee` -> `assignee.id`).
  const recordValue = (latest: object, path: string) => {
    const from = inputs[path]?.from
    return from ? getPath(latest, `${from}.id`) : getPath(latest, path)
  }
  const initialValues = (latest?: object) =>
    toFormValues(
      fields,
      (path) => (latest ? recordValue(latest, path) : defaultValue(schema, path)),
      (path) => inputs[path]?.input === 'checkbox',
    )
  const numbers = fields.filter((path) => ['number', 'relation'].includes(inputs[path]?.input ?? ''))
  const limits = Object.fromEntries(
    fields.filter((path) => inputs[path]?.input === 'number').map((path) => [path, numberLimits(schema, path)]),
  )
  const relationLabels = Object.fromEntries(
    fields.flatMap((path) => {
      const from = inputs[path]?.from
      return from && record ? [[path, getPath(record, `${from}.label`) as string | undefined]] : []
    }),
  )

  // The version the user started editing. It must not follow background refetches of the record,
  // or a save would silently overwrite someone else's change instead of failing with 409.
  const [version, setVersion] = useState(record?.version)
  const [formError, setFormError] = useState<string>()
  const [staleOpen, setStaleOpen] = useState(false)
  const [savedId, setSavedId] = useState<number>()

  const form = useForm<FormValues, unknown, Body>({
    resolver: formResolver<FormValues, Body>(schema as unknown as z.ZodType<Body>, { rules, numbers }),
    defaultValues: initialValues(record),
  })
  const { isDirty, isSubmitting } = form.formState

  // Validation messages already shown follow a language switch: client ones are re-validated,
  // server ones are translated again from their error code.
  useEffect(() => {
    const names: Path<FormValues>[] = []
    for (const [name, error] of errorsByPath(form.formState.errors)) {
      const translated = retranslateServerError(t, error)
      if (translated) form.setError(name, translated)
      else names.push(name)
    }
    if (names.length) void form.trigger(names)
    // Only the language change should re-run validation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language])

  // Navigate after the re-render that sets savedId has switched the unsaved-changes guard off.
  useEffect(() => {
    if (savedId !== undefined) navigate(`${resource.route}/${savedId}`, { replace: true })
  }, [savedId, navigate, resource.route])

  const onSubmit = async (body: Body) => {
    setFormError(undefined)
    try {
      const saved = await save(body, version)
      onSaved(saved)
      const name = formatDisplay(resource.display, saved)
      toast.success(t(record ? 'common.toast.updated' : 'common.toast.created', { name }))
      setSavedId(saved.id)
    } catch (error) {
      const outcome = applyApiError(error, form.setError, fields, t)
      if (outcome.kind === 'stale') setStaleOpen(true)
      if (outcome.kind === 'form') setFormError(outcome.message)
    }
  }

  const reloadLatest = async () => {
    const latest = await reload?.()
    setStaleOpen(false)
    if (!latest) return
    setVersion(latest.version)
    form.reset(initialValues(latest))
    // After the dialog has closed and restored focus, start again at the first field.
    setTimeout(() => form.setFocus(fields[0] as Path<FormValues>))
  }

  return (
    <Card>
      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          {formError && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertTitle>{t('common.form.errorTitle')}</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <FormFields
            resource={resource}
            control={form.control}
            required={required}
            enumValues={enumValues}
            numberLimits={limits}
            relationLabels={relationLabels}
          />
          {record && resource.form.readOnly && (
            <dl className="grid gap-x-8 gap-y-3 border-t pt-4 text-sm sm:grid-cols-2">
              {resource.form.readOnly.map((field) => (
                <div key={field} className="min-w-0">
                  <dt className="text-muted-foreground">{tDynamic(t, fieldLabelKey(resource.key, field))}</dt>
                  <dd className="mt-1 break-words">
                    {renderFieldValue(resource, field, getPath(record, field), t, language) || t('common.detail.empty')}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button asChild variant="outline">
              <Link to={cancelHref}>{t('common.actions.cancel')}</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.actions.saving') : t('common.actions.save')}
            </Button>
          </div>
        </form>
      </CardContent>
      <UnsavedChangesGuard when={isDirty && savedId === undefined} />
      <ConfirmDialog
        open={staleOpen}
        onOpenChange={setStaleOpen}
        title={t('common.form.staleTitle')}
        description={t('common.form.staleText')}
        confirmLabel={t('common.form.reload')}
        onConfirm={() => void reloadLatest()}
      />
    </Card>
  )
}
