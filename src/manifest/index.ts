// Typed access to ui-manifest.yaml, the source of per-resource UI decisions.
// Types cover the parts the app uses; extend them when a screen needs more of the manifest.
import manifestData from '../../ui-manifest.yaml'

export interface ResourceManifest {
  route: string
  nav: { icon: string; order: number }
  display: string
  permissions: { read: string[]; write: string[] }
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
