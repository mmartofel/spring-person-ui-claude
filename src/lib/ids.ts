import { useParams } from 'react-router'

/** The `:id` route param as a positive integer, or null when it is missing or malformed (→ 404 page). */
export function useIdParam(): number | null {
  const { id } = useParams()
  return id && /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) ? Number(id) : null
}
