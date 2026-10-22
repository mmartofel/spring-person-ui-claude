// Typed access to ui-manifest.yaml, the source of per-resource UI decisions.
// Types cover the parts the app uses; extend them when a screen needs more of the manifest.
import manifestData from '../../ui-manifest.yaml'

export type FieldFormat = 'text' | 'date' | 'dateTime' | 'number' | 'enum' | 'badge' | 'country' | 'relation'

/** A shadcn Badge variant, so badge colours come from the theme tokens. */
export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive'

export interface ColumnManifest {
  /** A field name, or a dot path into a nested object (`address.city`). */
  field: string
  sortable?: boolean
  format?: 'date' | 'enum' | 'badge' | 'relation'
  /** i18n enum name: values are labelled `enums.<enum>.<VALUE>` (a boolean: `true` / `false`). */
  enum?: string
  /** `format: relation`: the related resource; the value is an embedded reference `{ id, label }`. */
  resource?: ResourceKey
  /** `format: badge`: the Badge variant of each value. */
  badge?: Record<string, BadgeVariant>
  /** subtitle = shown under the card title (`display`) below `md`; without it the column is table-only. */
  mobile?: 'subtitle'
}

export interface FormFieldManifest {
  input: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'country' | 'relation'
  enum?: string
  allowEmpty?: boolean
  /** `input: relation`: the related resource, searched through its list endpoint. */
  resource?: ResourceKey
  /** `input: relation`: the response field with the embedded reference `{ id, label }` that fills the input. */
  from?: string
  /** Another field this one must not be earlier than (error code `date-range`). */
  notBefore?: string
}

/** A nested object in the form: a fieldset whose rows name fields relative to the object. */
export interface FormObjectGroup {
  object: string
  groups: string[][]
}

/** A row of fields, or a fieldset for a nested object. */
export type FormGroup = string[] | FormObjectGroup

/** A named query parameter of the list endpoint; the URL uses the same name. */
export interface FilterManifest {
  param: string
  input: 'select' | 'boolean' | 'date' | 'country' | 'relation'
  /** i18n enum name of a select or boolean filter. */
  enum?: string
  /** `input: relation`: the related resource. */
  resource?: ResourceKey
}

/** Records of another resource that point to this one, shown under the detail. */
export interface RelatedManifest {
  resource: ResourceKey
  /** The related resource's list filter that takes this record's id. */
  filter: string
  limit: number
}

export interface ResourceManifest {
  route: string
  nav: { icon: string; order: number }
  /** How one record is named, e.g. "{firstName} {lastName}". */
  display: string
  permissions: { read: string[]; write: string[] }
  list: {
    defaultSort: string
    pageSize: number
    pageSizes: number[]
    columns: ColumnManifest[]
    filters?: FilterManifest[]
  }
  detail: { fields: string[]; related?: RelatedManifest[] }
  form: {
    /** Rows of fields shown side by side from `md`, and fieldsets for nested objects. */
    groups: FormGroup[]
    fields?: Record<string, FormFieldManifest>
    /** Server-set fields shown under the edit form, never editable. */
    readOnly?: string[]
  }
  /** Formats of fields that are neither list columns nor form inputs. */
  formats?: Record<string, 'date' | 'dateTime' | 'number'>
}

/** Resource keys; each one is also the i18n namespace key (`<resource>.title`). */
export type ResourceKey = 'persons' | 'tasks'

interface Manifest {
  resources: Record<ResourceKey, ResourceManifest>
}

const manifest = manifestData as Manifest

export interface Resource extends ResourceManifest {
  key: ResourceKey
}

/** All resources in navigation order. */
export const resources: Resource[] = (Object.keys(manifest.resources) as ResourceKey[])
  .map((key) => ({ key, ...manifest.resources[key] }))
  .sort((a, b) => a.nav.order - b.nav.order)

export function getResource(key: ResourceKey): Resource {
  const resource = resources.find((r) => r.key === key)
  if (!resource) throw new Error(`Unknown resource: ${key}`)
  return resource
}

const hasAnyRole = (userRoles: readonly string[], allowed: readonly string[]) =>
  allowed.some((role) => userRoles.includes(role))

export function canRead(userRoles: readonly string[], resource: Resource): boolean {
  return hasAnyRole(userRoles, resource.permissions.read)
}

export function canWrite(userRoles: readonly string[], resource: Resource): boolean {
  return hasAnyRole(userRoles, resource.permissions.write)
}

export const isObjectGroup = (group: FormGroup): group is FormObjectGroup => !Array.isArray(group)

/** The sub-fields of a nested object, from its form fieldset (`address` -> `street`, `city`, ...). */
export function objectFields(resource: Resource, object: string): string[] | undefined {
  const group = resource.form.groups.find((g) => isObjectGroup(g) && g.object === object)
  return group && isObjectGroup(group) ? group.groups.flat() : undefined
}

/** Every form field as a full path (`firstName`, `address.city`), in form order. */
export function formFieldPaths(resource: Resource): string[] {
  return resource.form.groups.flatMap((group) =>
    isObjectGroup(group) ? group.groups.flat().map((field) => `${group.object}.${field}`) : group,
  )
}

export interface FieldDisplay {
  format: FieldFormat
  enum?: string
  badge?: Record<string, BadgeVariant>
  resource?: ResourceKey
}

/** How a field's value is shown: from the list column, else `formats`, else the form input, else plain text. */
export function fieldFormat(resource: Resource, field: string): FieldDisplay {
  const column = resource.list.columns.find((c) => c.field === field)
  if (column?.format) return { format: column.format, enum: column.enum, badge: column.badge, resource: column.resource }
  const format = resource.formats?.[field]
  if (format) return { format }
  const input = resource.form.fields?.[field]
  if (input?.input === 'date') return { format: 'date' }
  if (input?.input === 'number') return { format: 'number' }
  if (input?.input === 'country') return { format: 'country' }
  if (input?.input === 'select' && input.enum) return { format: 'enum', enum: input.enum }
  return { format: 'text' }
}

/** A value by dot path (`address.city`); undefined when any part is missing. */
export function getPath(record: object, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => (value as Record<string, unknown> | null)?.[key], record)
}

/** Fills a display template such as "{firstName} {lastName}" from a record. */
export function formatDisplay(template: string, record: object): string {
  const values = record as Record<string, unknown>
  return template
    .replace(/\{(\w+)\}/g, (_, field: string) => (values[field] == null ? '' : String(values[field])))
    .replace(/\s+/g, ' ')
    .trim()
}
