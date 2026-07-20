/** Normaliza patente: mayúsculas, sin guión ni espacios */
export function normalizePatente(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}

/**
 * Formatos válidos Chile:
 * - Antiguo: AB1234 (2 letras + 4 números)
 * - Nuevo:   ABCD12 (4 letras + 2 números)
 */
export function isValidPatenteChilena(value: string): boolean {
  const p = normalizePatente(value)
  return /^([A-Z]{2}\d{4}|[A-Z]{4}\d{2})$/.test(p)
}

/** Muestra con guión: AB-1234 o ABCD-12 */
export function formatPatenteDisplay(value: string): string {
  const p = normalizePatente(value)
  if (/^[A-Z]{2}\d{4}$/.test(p)) return `${p.slice(0, 2)}-${p.slice(2)}`
  if (/^[A-Z]{4}\d{2}$/.test(p)) return `${p.slice(0, 4)}-${p.slice(4)}`
  return value.toUpperCase().trim()
}
