/** Normaliza patente: mayúsculas, sin guión ni espacios */
export function normalizePatente(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/**
 * Formato único de flota: XXXX-XX
 * (4 letras + 2 números, ej. ABCD-12)
 */
export function isValidPatenteChilena(value: string): boolean {
  const p = normalizePatente(value);
  return /^[A-Z]{4}\d{2}$/.test(p);
}

/** Muestra siempre como XXXX-XX (máx. 6 caracteres alfanuméricos) */
export function formatPatenteDisplay(value: string): string {
  const p = normalizePatente(value).slice(0, 6);
  if (p.length <= 4) return p;
  return `${p.slice(0, 4)}-${p.slice(4)}`;
}
