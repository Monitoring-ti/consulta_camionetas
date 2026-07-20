/** Normaliza URL opcional: vacío → null; agrega https:// si falta esquema */
export function normalizeOptionalUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

/** Valida URL opcional después de normalizar */
export function isValidOptionalUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  try {
    const url = normalizeOptionalUrl(trimmed)!
    new URL(url)
    return true
  } catch {
    return false
  }
}
