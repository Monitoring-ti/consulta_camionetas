/**
 * Formatea una patente chilena: ABCD12 → ABCD·12 o AB·1234
 */
export function formatPatente(patente: string): string {
  return patente?.toUpperCase() ?? '—'
}

/**
 * Formatea RUT chileno: 12345678 → 12.345.678-X
 */
export function formatRut(rut: string | null | undefined): string {
  if (!rut) return '—'
  const clean = rut.replace(/\./g, '').replace(/-/g, '')
  if (clean.length < 2) return rut
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formatted}-${dv}`
}

/**
 * Formatea número con separadores de miles.
 */
export function formatKm(km: number | null | undefined): string {
  if (km === null || km === undefined) return '—'
  return km.toLocaleString('es-CL') + ' km'
}

/**
 * Trunca texto largo con elipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (!text) return ''
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text
}
