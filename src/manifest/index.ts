// Typed access to ui-manifest.yaml, the source of per-resource UI decisions.
// Types cover the parts the app uses; extend them when a screen needs more of the manifest.
import manifestData from '../../ui-manifest.yaml'

export type FieldFormat = 'text' | 'date' | 'enum'

export interface ColumnManifest {
  field: string
  sortable?: boolean
  format?: 'date' | 'enum'
  /** i18n enum name: values are labelled `enums.<enum>.<VALUE>`. */
  enum?: string
  /** subtitle = shown under the card title (`display`) below `md`; without it the column is table-only. */
  mobile?: 'subtitle'
}

export interface FormFieldManifest {
  input: 'text' | 'date' | 'select'
  enum?: string
  allowEmpty?: boolean
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
  }
  detail: { fields: string[] }
  form: {
    /** Rows of fields shown side by side from `md`. */
    groups: string[][]
    fields?: Record<string, FormFieldManifest>
  }
}

/** Resource keys; each one is also the i18n namespace key (`<resource>.title`). */
export type ResourceKey = 'persons'

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

/** How a field's value is shown: from the list column, else from the form input, else plain text. */
export function fieldFormat(resource: Resource, field: string): { format: FieldFormat; enum?: string } {
  const column = resource.list.columns.find((c) => c.field === field)
  if (column?.format) return { format: column.format, enum: column.enum }
  const input = resource.form.fields?.[field]
  if (input?.input === 'date') return { format: 'date' }
  if (input?.input === 'select' && input.enum) return { format: 'enum', enum: input.enum }
  return { format: 'text' }
}

/** Fills a display template such as "{firstName} {lastName}" from a record. */
export function formatDisplay(template: string, record: object): string {
  const values = record as Record<string, unknown>
  return template
    .replace(/\{(\w+)\}/g, (_, field: string) => (values[field] == null ? '' : String(values[field])))
    .replace(/\s+/g, ' ')
    .trim()
}
