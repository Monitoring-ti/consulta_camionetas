/** Normaliza RUT chileno: quita puntos/guión, DV en mayúscula */
export function normalizeRut(rut: string): string {
  return rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
}

/** Valida dígito verificador módulo 11 */
export function isValidRut(rut: string): boolean {
  const clean = normalizeRut(rut);
  if (clean.length < 2) return false;

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);

  if (!/^\d+$/.test(body)) return false;

  let sum = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }

  const expected = 11 - (sum % 11);
  const expectedDv =
    expected === 11 ? '0' : expected === 10 ? 'K' : String(expected);

  return dv === expectedDv;
}

/** Formato visual 12.345.678-9 mientras escribe */
export function formatRutInput(value: string): string {
  const clean = normalizeRut(value);
  if (clean.length <= 1) return clean;

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted}-${dv}`;
}
