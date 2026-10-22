import { useEffect, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { useForm, type FieldValues, type Path } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import type { z } from 'zod'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDisplay, type Resource } from '@/manifest'
import { ConfirmDialog } from '../ConfirmDialog'
import { applyApiError, retranslateServerError } from './applyApiError'
import { FormFields } from './FormFields'
import { formResolver, isRequired } from './formResolver'
import { UnsavedChangesGuard } from './UnsavedChangesGuard'

/** A record as the API returns it: every editable resource has an id and an optimistic-locking version. */
export interface VersionedRecord {
  id: number
  version: number
}

type FormValues = Record<string, string>

/** Form state holds strings; '' means "no value". */
function toFormValues(fields: readonly string[], record?: object): FormValues {
  const values = (record ?? {}) as Record<string, unknown>
  return Object.fromEntries(fields.map((field) => [field, values[field] == null ? '' : String(values[field])]))
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
  const navigate = useNavigate()
  const fields = Object.keys(schema.shape)
  const required = fields.filter((field) => isRequired(schema, field))

  // The version the user started editing. It must not follow background refetches of the record,
  // or a save would silently overwrite someone else's change instead of failing with 409.
  const [version, setVersion] = useState(record?.version)
  const [formError, setFormError] = useState<string>()
  const [staleOpen, setStaleOpen] = useState(false)
  const [savedId, setSavedId] = useState<number>()

  const form = useForm<FormValues, unknown, Body>({
    resolver: formResolver<FormValues, Body>(schema as unknown as z.ZodType<Body>),
    defaultValues: toFormValues(fields, record),
  })
  const { isDirty, isSubmitting } = form.formState

  // Validation messages already shown follow a language switch: client ones are re-validated,
  // server ones are translated again from their error code.
  useEffect(() => {
    const names: string[] = []
    for (const [name, error] of Object.entries(form.formState.errors)) {
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
    form.reset(toFormValues(fields, latest))
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
          <FormFields resource={resource} control={form.control} required={required} enumValues={enumValues} />
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
