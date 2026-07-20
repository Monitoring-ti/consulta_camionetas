/** Clases de licencia de conducir Chile (municipal) */
export const LICENSE_TYPES = ['A1', 'A2', 'A3', 'A4', 'A5', 'B', 'C', 'D', 'E', 'F'] as const
export type LicenseType = (typeof LICENSE_TYPES)[number]

/** Parsea tipos desde texto libre ("B", "A2, B", "A3;B"). */
export function parseLicenseTypes(value: string | null | undefined): LicenseType[] {
  if (!value?.trim()) return []
  const parts = value
    .toUpperCase()
    .split(/[,;/\s|]+/)
    .map(s => s.trim())
    .filter(Boolean)

  const seen = new Set<LicenseType>()
  for (const part of parts) {
    const match = LICENSE_TYPES.find(t => t === part)
    if (match) seen.add(match)
  }
  return LICENSE_TYPES.filter(t => seen.has(t))
}

/** Serializa tipos seleccionados a string para guardar en DB. */
export function serializeLicenseTypes(types: string[]): string | null {
  const selected = parseLicenseTypes(types.join(','))
  return selected.length > 0 ? selected.join(', ') : null
}
