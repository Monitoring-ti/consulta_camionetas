import {
  formatPatenteDisplay,
  isValidPatenteChilena,
} from '@/lib/utils/patente'
import { isValidOptionalUrl, normalizeOptionalUrl } from '@/lib/utils/urls'
import type { VehicleInsert, VehicleUpdate } from '@/types/app.types'

export type VehicleFormPayload = VehicleInsert | VehicleUpdate

export type VehiclePayloadInput = {
  patente?: string | null
  marca?: string | null
  modelo?: string | null
  anio?: number | string | null
  km_actual?: number | string | null
  is_active?: boolean | null
  proveedor_arriendo?: string | null
  contrato_pertenece?: string | null
  fecha_revision_tecnica?: string | null
  vencimiento_seguro?: string | null
  vencimiento_permiso?: string | null
  vencimiento_extintor?: string | null
  certificado_torque_ruedas?: string | null
  vencimiento_torque_ruedas?: string | null
  certificado_gps?: string | null
  vencimiento_gps?: string | null
}

export function validateVehiclePayload(
  payload: VehiclePayloadInput
): { ok: true; data: VehicleInsert } | { ok: false; error: string } {
  const patenteRaw = String(payload.patente ?? '').trim()
  if (!patenteRaw) {
    return { ok: false, error: 'La patente es obligatoria.' }
  }
  if (!isValidPatenteChilena(patenteRaw)) {
    return {
      ok: false,
      error: 'Patente inválida. Use formato chileno: AB1234 (antiguo) o ABCD12 (nuevo).',
    }
  }

  const marca = String(payload.marca ?? '').trim()
  const modelo = String(payload.modelo ?? '').trim()
  if (!marca) return { ok: false, error: 'La marca es obligatoria.' }
  if (!modelo) return { ok: false, error: 'El modelo es obligatorio.' }

  const anio = payload.anio
  if (anio === null || anio === undefined || Number.isNaN(Number(anio))) {
    return { ok: false, error: 'El año es obligatorio y debe ser un número válido.' }
  }
  const anioNum = Number(anio)
  if (anioNum < 1990 || anioNum > 2035) {
    return { ok: false, error: 'El año debe estar entre 1990 y 2035.' }
  }

  const proveedor = String(payload.proveedor_arriendo ?? '').trim()
  if (!proveedor) {
    return { ok: false, error: 'El proveedor de arriendo es obligatorio.' }
  }

  const fechaRevision = payload.fecha_revision_tecnica
  if (!fechaRevision) {
    return { ok: false, error: 'La fecha de revisión técnica es obligatoria.' }
  }

  for (const [label, url] of [
    ['Certificado Torque', payload.certificado_torque_ruedas],
    ['Certificado GPS', payload.certificado_gps],
  ] as const) {
    if (url && !isValidOptionalUrl(String(url))) {
      return { ok: false, error: `${label}: ingrese una URL válida (ej. https://drive.google.com/...).` }
    }
  }

  const km = payload.km_actual
  const kmNum =
    km === null || km === undefined || km === ''
      ? 0
      : Number(km)
  if (Number.isNaN(kmNum) || kmNum < 0) {
    return { ok: false, error: 'El kilometraje debe ser un número mayor o igual a 0.' }
  }

  const sanitized: VehicleInsert = {
    patente: formatPatenteDisplay(patenteRaw),
    marca,
    modelo,
    anio: anioNum,
    km_actual: kmNum,
    is_active: payload.is_active ?? true,
    proveedor_arriendo: proveedor,
    contrato_pertenece: payload.contrato_pertenece
      ? String(payload.contrato_pertenece).trim() || null
      : null,
    fecha_revision_tecnica: String(fechaRevision),
    vencimiento_seguro: payload.vencimiento_seguro || null,
    vencimiento_permiso: payload.vencimiento_permiso || null,
    vencimiento_extintor: payload.vencimiento_extintor || null,
    certificado_torque_ruedas: normalizeOptionalUrl(String(payload.certificado_torque_ruedas ?? '')),
    vencimiento_torque_ruedas: payload.vencimiento_torque_ruedas || null,
    certificado_gps: normalizeOptionalUrl(String(payload.certificado_gps ?? '')),
    vencimiento_gps: payload.vencimiento_gps || null,
  }


  return { ok: true, data: sanitized }
}

export function translateVehicleDbError(message: string, code?: string): string {
  if (code === '23505' || message.includes('vehicles_patente_key')) {
    return 'Ya existe un vehículo con esa patente. Verifique si está registrado con otro formato (ej. BZAK-11 vs BZAK11).'
  }
  if (code === '23502' || message.includes('not-null constraint')) {
    if (message.includes('fecha_revision_tecnica')) {
      return 'La fecha de revisión técnica es obligatoria.'
    }
    if (message.includes('anio')) {
      return 'El año es obligatorio.'
    }
    if (message.includes('proveedor_arriendo')) {
      return 'El proveedor de arriendo es obligatorio.'
    }
    return 'Faltan campos obligatorios. Revise el formulario.'
  }
  if (code === '22P02') {
    return 'Hay un valor numérico inválido (año o kilometraje).'
  }
  return message
}
