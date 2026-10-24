import type { Resource, ResourceKey } from '@/manifest'

/**
 * The related resource's `mobile: subtitle` columns shown on each row, without a relation column that points back to
 * `parent`: every row refers to the record being shown, so its name would repeat on each one.
 */
export function relatedSubtitleFields(related: Resource, parent: ResourceKey): string[] {
  return related.list.columns
    .filter((c) => c.mobile === 'subtitle' && !(c.format === 'relation' && c.resource === parent))
    .map((c) => c.field)
}
