/**
 * Resuelve URLs del bucket `vehicle-photos`.
 * Si ya es http(s), se deja igual; si es path relativo, arma la URL pública.
 */
export function resolveVehiclePhotoUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  const raw = url.trim()
  if (/^https?:\/\//i.test(raw)) return raw

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  if (!base) return raw

  const path = raw
    .replace(/^\/+/, '')
    .replace(/^storage\/v1\/object\/public\/vehicle-photos\//i, '')
    .replace(/^vehicle-photos\//i, '')

  return `${base}/storage/v1/object/public/vehicle-photos/${path}`
}
