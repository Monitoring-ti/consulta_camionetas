'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createAuthClient } from '@/lib/supabase/server'
import { formatPatenteDisplay, normalizePatente } from '@/lib/utils/patente'
import {
  groupInspectionsByWeek,
  summarizeInspectors,
  isInspectionApto,
} from '@/lib/utils/inspection-history'
import { resolveVehiclePhotoUrl } from '@/lib/utils/storage-url'
import { translateVehicleDbError, validateVehiclePayload } from '@/lib/utils/vehicle-form'
import type {
  TrabajadorDocVenc,
  DocVencPayload,
  Vehicle,
  VehicleInsert,
  VehicleUpdate,
  Inspection,
  InspectionDetail,
  InspectionWithInspector,
  InspectionFull,
} from '@/types/app.types'

const WORKER_SELECT = [
  'id_trabajador',
  'numero_identificacion',
  'nombre_1',
  'nombre_2',
  'apellido_paterno',
  'apellido_materno',
  'cargo',
  'area_departamento',
  'tipo_identificacion',
  'vencimiento_licencia_conducir',
  'vencimiento_examen_ocupacional',
  'vencimiento_altura_geo',
  'vencimiento_psicosensometrico',
  'licencia_conducir_tipo',
  'licencia_conducir_numero',
  'numero_licencia_interna',
  'vencimiento_licencia_interna',
].join(', ')

const WORKER_SELECT_LEGACY = [
  'id_trabajador',
  'numero_identificacion',
  'nombre_1',
  'nombre_2',
  'apellido_paterno',
  'apellido_materno',
  'cargo',
  'area_departamento',
  'tipo_identificacion',
  'vencimiento_licencia_conducir',
  'vencimiento_examen_ocupacional',
  'vencimiento_altura_geo',
  'vencimiento_psicosensometrico',
  'licencia_conducir_tipo',
  'licencia_conducir_numero',
].join(', ')

function withInternalLicenseDefaults(
  rows: Array<Record<string, unknown>>
): TrabajadorDocVenc[] {
  return rows.map(row => ({
    ...(row as unknown as TrabajadorDocVenc),
    numero_licencia_interna: (row.numero_licencia_interna as string | null | undefined) ?? null,
    vencimiento_licencia_interna:
      (row.vencimiento_licencia_interna as string | null | undefined) ?? null,
  }))
}

function isMissingInternalLicenseColumn(message: string): boolean {
  return (
    message.includes('numero_licencia_interna') ||
    message.includes('vencimiento_licencia_interna')
  )
}

// ─── Obtener todos los trabajadores (solo docs) ───────────────────────────────
export async function fetchWorkers(): Promise<TrabajadorDocVenc[]> {
  const supabase = createAdminClient()
  const { data, error } = await (supabase.from('trabajadores') as any)
    .select(WORKER_SELECT)
    .eq('tipo_identificacion', 'RUT')
    .order('apellido_paterno')

  if (error) {
    if (isMissingInternalLicenseColumn(String(error.message ?? ''))) {
      const legacy = await (supabase.from('trabajadores') as any)
        .select(WORKER_SELECT_LEGACY)
        .eq('tipo_identificacion', 'RUT')
        .order('apellido_paterno')
      if (legacy.error) throw new Error(legacy.error.message)
      return withInternalLicenseDefaults((legacy.data ?? []) as Array<Record<string, unknown>>)
    }
    throw new Error(error.message)
  }
  return withInternalLicenseDefaults((data ?? []) as Array<Record<string, unknown>>)
}

// ─── Buscar trabajador por RUT ────────────────────────────────────────────────
export async function findWorkerByRut(rut: string): Promise<TrabajadorDocVenc | null> {
  const supabase = createAdminClient()
  const normalizedRut = rut.replace(/[^0-9kK]/g, '').toUpperCase()

  const { data, error } = await (supabase.from('trabajadores') as any)
    .select(WORKER_SELECT)
    .eq('tipo_identificacion', 'RUT')
    .ilike('numero_identificacion', `%${normalizedRut}%`)
    .limit(1)
    .single()

  if (error || !data) {
    if (error && isMissingInternalLicenseColumn(String(error.message ?? ''))) {
      const legacy = await (supabase.from('trabajadores') as any)
        .select(WORKER_SELECT_LEGACY)
        .eq('tipo_identificacion', 'RUT')
        .ilike('numero_identificacion', `%${normalizedRut}%`)
        .limit(1)
        .single()
      if (legacy.error || !legacy.data) return null
      return withInternalLicenseDefaults([legacy.data as Record<string, unknown>])[0]
    }
    return null
  }
  return withInternalLicenseDefaults([data as Record<string, unknown>])[0]
}

const DOC_VENC_ALLOWED_KEYS = [
  'vencimiento_licencia_conducir',
  'licencia_conducir_tipo',
  'vencimiento_psicosensometrico',
  'numero_licencia_interna',
  'vencimiento_licencia_interna',
] as const satisfies ReadonlyArray<keyof DocVencPayload>

// ─── Actualizar solo campos de licencia / psico permitidos ───────────────────
export async function updateWorkerDocuments(
  id_trabajador: string,
  payload: Partial<DocVencPayload>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const clean: Partial<DocVencPayload> = {}
    for (const key of DOC_VENC_ALLOWED_KEYS) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        const val = payload[key]
        clean[key] = typeof val === 'string' && val.trim() === '' ? null : (val ?? null)
      }
    }

    if (Object.keys(clean).length === 0) {
      return { ok: false, error: 'No hay campos permitidos para actualizar' }
    }

    const supabase = createAdminClient()
    const { error } = await (supabase.from('trabajadores') as any)
      .update(clean)
      .eq('id_trabajador', id_trabajador)

    if (error) {
      if (isMissingInternalLicenseColumn(error.message)) {
        return {
          ok: false,
          error:
            'Faltan columnas de licencia interna en la base. Aplica la migración 20260720_trabajador_licencia_interna.sql en Supabase.',
        }
      }
      return { ok: false, error: error.message }
    }

    revalidatePath('/workers')
    revalidatePath(`/workers/${encodeURIComponent(id_trabajador)}/edit`)
    revalidatePath('/dashboard')
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Error del servidor' }
  }
}

// ─── Alertas de vencimiento (próximos 60 días + vencidos) ─────────────────────
export interface AlertaDocVenc {
  id_trabajador: string
  nombre: string
  rut: string
  cargo: string | null
  area: string | null
  campo: string
  label: string
  fecha: string
  daysLeft: number
}

export async function fetchAlertasVencimiento(): Promise<AlertaDocVenc[]> {
  const supabase = createAdminClient()

  const { data, error } = await (supabase.from('trabajadores') as any)
    .select(`
      id_trabajador,
      nombre_1, apellido_paterno,
      numero_identificacion,
      cargo,
      area_departamento,
      vencimiento_licencia_conducir,
      vencimiento_psicosensometrico,
      vencimiento_licencia_interna
    `)
    .eq('tipo_identificacion', 'RUT')

  if (error || !data) {
    if (error && isMissingInternalLicenseColumn(String(error.message ?? ''))) {
      const legacy = await (supabase.from('trabajadores') as any)
        .select(`
          id_trabajador,
          nombre_1, apellido_paterno,
          numero_identificacion,
          cargo,
          area_departamento,
          vencimiento_licencia_conducir,
          vencimiento_psicosensometrico
        `)
        .eq('tipo_identificacion', 'RUT')
      if (legacy.error || !legacy.data) return []
      return buildWorkerAlerts(legacy.data as any[], [
        { key: 'vencimiento_licencia_conducir', label: 'Licencia Conducir' },
        { key: 'vencimiento_psicosensometrico', label: 'Psicosensométrico' },
      ])
    }
    return []
  }

  return buildWorkerAlerts(data as any[], [
    { key: 'vencimiento_licencia_conducir', label: 'Licencia Conducir' },
    { key: 'vencimiento_psicosensometrico', label: 'Psicosensométrico' },
    { key: 'vencimiento_licencia_interna', label: 'Licencia Interna' },
  ])
}

function buildWorkerAlerts(
  data: any[],
  campos: { key: string; label: string }[]
): AlertaDocVenc[] {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const alertas: AlertaDocVenc[] = []

  for (const row of data) {
    for (const { key, label } of campos) {
      const fecha = row[key] as string | null
      if (!fecha) continue

      const fechaDate = new Date(fecha)
      fechaDate.setHours(0, 0, 0, 0)
      const daysLeft = Math.ceil((fechaDate.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))

      if (daysLeft <= 60) {
        alertas.push({
          id_trabajador: row.id_trabajador,
          nombre: `${row.nombre_1} ${row.apellido_paterno}`,
          rut: row.numero_identificacion,
          cargo: row.cargo,
          area: row.area_departamento,
          campo: key,
          label,
          fecha,
          daysLeft,
        })
      }
    }
  }

  return alertas.sort((a, b) => a.daysLeft - b.daysLeft)
}

// ─── Vehículos (service role: RLS bloquea lecturas con cliente autenticado) ───
export async function fetchVehicles(options?: {
  activeOnly?: boolean
}): Promise<Vehicle[]> {
  const supabase = createAdminClient()
  let query = supabase
    .from('vehicles')
    .select('*')
    .is('deleted_at', null)
    .order('patente')

  if (options?.activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) {
    // Fallback si la migración deleted_at aún no está aplicada
    if (error.message.includes('deleted_at')) {
      let legacy = supabase.from('vehicles').select('*').order('patente')
      if (options?.activeOnly) legacy = legacy.eq('is_active', true)
      const legacyRes = await legacy
      if (legacyRes.error) throw new Error(legacyRes.error.message)
      return (legacyRes.data ?? []) as Vehicle[]
    }
    throw new Error(error.message)
  }
  return (data ?? []) as Vehicle[]
}

export async function fetchActiveVehicles(): Promise<Vehicle[]> {
  return fetchVehicles({ activeOnly: true })
}

export async function fetchInactiveVehicles(): Promise<Vehicle[]> {
  const all = await fetchVehicles()
  return all
    .filter(v => v.is_active === false)
    .sort((a, b) => a.patente.localeCompare(b.patente, 'es'))
}

export async function fetchVehicleById(id: string): Promise<Vehicle | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !data) {
    // Fallback sin columna deleted_at
    if (error?.message.includes('deleted_at')) {
      const legacy = (await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .single()) as unknown as { data: Vehicle | null; error: { message: string } | null }
      if (legacy.error || !legacy.data) return null
      return legacy.data
    }
    return null
  }
  return data as Vehicle
}

async function findVehicleByNormalizedPatente(
  patenteKey: string,
  excludeId?: string
): Promise<Vehicle | null> {
  const vehicles = await fetchVehicles()
  return (
    vehicles.find(v => {
      if (excludeId && v.id === excludeId) return false
      return normalizePatente(v.patente) === patenteKey
    }) ?? null
  )
}

export async function saveVehicleAction(
  mode: 'create' | 'edit',
  id: string | undefined,
  payload: VehicleInsert | VehicleUpdate
): Promise<{ ok: true; data: Vehicle } | { ok: false; error: string }> {
  try {
    const validated = validateVehiclePayload(payload)
    if (!validated.ok) {
      return { ok: false, error: validated.error }
    }

    const data = validated.data
    const patenteKey = normalizePatente(String(data.patente ?? ''))
    const duplicate = await findVehicleByNormalizedPatente(patenteKey, mode === 'edit' ? id : undefined)
    if (duplicate) {
      if (duplicate.is_active === false) {
        return {
          ok: false,
          error: `La patente ${duplicate.patente} está en el historial (desactivada). Reactívela desde Vehículos → Historial en lugar de crear otra.`,
        }
      }
      return {
        ok: false,
        error: `Ya existe un vehículo con patente ${duplicate.patente}. Use otro registro o edite el existente.`,
      }
    }

    const supabase = createAdminClient()
    let result
    if (mode === 'create') {
      result = await supabase.from('vehicles').insert([data] as unknown as never[]).select().single()
    } else {
      if (!id) throw new Error('ID is required for editing')
      result = await supabase.from('vehicles').update(data as unknown as never).eq('id', id).select().single()
    }

    if (result.error) {
      return {
        ok: false,
        error: translateVehicleDbError(result.error.message, result.error.code),
      }
    }

    revalidatePath('/vehicles')
    revalidatePath('/inspections')
    revalidatePath('/dashboard')
    if (id) {
      revalidatePath(`/vehicles/${id}`)
      revalidatePath(`/vehicles/${id}/edit`)
    }

    return { ok: true, data: result.data as Vehicle }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Error del servidor' }
  }
}

export async function deleteVehicleAction(id: string) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('vehicles').update({ is_active: false } as unknown as never).eq('id', id)
    if (error) {
      return { ok: false, error: translateVehicleDbError(error.message, error.code) }
    }
    revalidatePath('/vehicles')
    revalidatePath('/inspections')
    revalidatePath('/dashboard')
    revalidatePath(`/vehicles/${id}`)
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Error del servidor' }
  }
}

/** Reactiva un vehículo del historial (is_active = true). Conserva todos sus datos. */
export async function reactivateVehicleAction(id: string) {
  try {
    const existing = await fetchVehicleById(id)
    if (!existing) {
      return { ok: false as const, error: 'Vehículo no encontrado o ya eliminado.' }
    }
    if (existing.deleted_at) {
      return { ok: false as const, error: 'No se puede reactivar un vehículo eliminado.' }
    }
    if (existing.is_active !== false) {
      return { ok: false as const, error: 'El vehículo ya está activo.' }
    }

    const patenteKey = normalizePatente(existing.patente)
    const conflict = await findVehicleByNormalizedPatente(patenteKey, id)
    if (conflict && conflict.is_active !== false) {
      return {
        ok: false as const,
        error: `No se puede reactivar: ya hay un vehículo activo con patente ${conflict.patente}.`,
      }
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('vehicles')
      .update({ is_active: true } as unknown as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { ok: false as const, error: translateVehicleDbError(error.message, error.code) }
    }

    revalidatePath('/vehicles')
    revalidatePath('/inspections')
    revalidatePath('/dashboard')
    revalidatePath(`/vehicles/${id}`)
    revalidatePath(`/vehicles/${id}/edit`)
    return { ok: true as const, data: data as Vehicle }
  } catch (err: any) {
    return { ok: false as const, error: err.message || 'Error del servidor' }
  }
}

/**
 * Eliminación definitiva solo desde historial (desactivado).
 * Borra inspecciones y detalles asociados a la patente, y registra auditoría del vehículo.
 */
export async function permanentlyDeleteVehicleAction(id: string) {
  try {
    const auth = await createAuthClient()
    const {
      data: { user },
    } = await auth.auth.getUser()
    if (!user?.email) {
      return { ok: false as const, error: 'Debe iniciar sesión para eliminar un vehículo.' }
    }

    const existing = await fetchVehicleById(id)
    if (!existing) {
      return { ok: false as const, error: 'Vehículo no encontrado o ya eliminado.' }
    }
    if (existing.is_active !== false) {
      return {
        ok: false as const,
        error: 'Solo se pueden eliminar vehículos desactivados. Desactívelo primero (historial).',
      }
    }
    if (existing.deleted_at) {
      return { ok: false as const, error: 'Este vehículo ya fue eliminado.' }
    }

    const deletedAt = new Date().toISOString()
    const deletedBy = user.email
    const supabase = createAdminClient()
    const patenteKey = normalizePatente(existing.patente)

    // ── 1) Inspecciones de esta patente (variantes de formato) ──
    const display = formatPatenteDisplay(patenteKey)
    const patenteVariants = Array.from(
      new Set([existing.patente.trim().toUpperCase(), display, patenteKey].filter(Boolean))
    )

    let inspectionsToDelete: Array<{ id: string; patente: string }> = []
    {
      const { data: matched, error: inspFetchError } = await supabase
        .from('monitoring_inspections')
        .select('id, patente')
        .or(patenteVariants.map(v => `patente.eq.${v}`).join(','))

      if (inspFetchError) {
        return { ok: false as const, error: inspFetchError.message }
      }

      inspectionsToDelete = ((matched as Array<{ id: string; patente: string }> | null) ?? []).filter(
        row => normalizePatente(row.patente) === patenteKey
      )
    }
    const inspectionIds = inspectionsToDelete.map(r => r.id)

    if (inspectionIds.length > 0) {
      for (let i = 0; i < inspectionIds.length; i += 100) {
        const chunk = inspectionIds.slice(i, i + 100)

        const { error: detailsError } = await supabase
          .from('monitoring_inspection_details')
          .delete()
          .in('inspection_id', chunk)

        if (detailsError) {
          return {
            ok: false as const,
            error: `No se pudieron borrar los detalles de inspección: ${detailsError.message}`,
          }
        }

        // Tabla legada (si existe); ignorar si no está en el esquema
        const resultsDelete = await supabase
          .from('monitoring_inspection_results')
          .delete()
          .in('inspection_id', chunk)
        if (
          resultsDelete.error &&
          !resultsDelete.error.message.includes('monitoring_inspection_results') &&
          resultsDelete.error.code !== '42P01'
        ) {
          return {
            ok: false as const,
            error: `No se pudieron borrar resultados de inspección: ${resultsDelete.error.message}`,
          }
        }

        const { error: inspDeleteError } = await supabase
          .from('monitoring_inspections')
          .delete()
          .in('id', chunk)

        if (inspDeleteError) {
          return {
            ok: false as const,
            error: `No se pudieron borrar las inspecciones: ${inspDeleteError.message}`,
          }
        }
      }
    }

    // ── 2) Auditoría del vehículo ──
    const { error: logError } = await supabase.from('vehicle_deletion_log').insert([
      {
        vehicle_id: existing.id,
        patente: existing.patente,
        marca: existing.marca,
        modelo: existing.modelo,
        anio: existing.anio,
        snapshot: {
          vehicle: existing,
          inspections_deleted: inspectionIds.length,
          inspection_ids: inspectionIds,
        } as unknown as Record<string, unknown>,
        deleted_by: deletedBy,
        deleted_at: deletedAt,
      },
    ] as unknown as never[])

    if (logError) {
      if (logError.message.includes('vehicle_deletion_log') || logError.code === '42P01') {
        return {
          ok: false as const,
          error:
            'Falta aplicar la migración de auditoría en Supabase (vehicle_deletion_log / deleted_at). Ejecute checklist/supabase/migrations/20260720_vehicle_deletion_audit.sql',
        }
      }
      return { ok: false as const, error: logError.message }
    }

    const { error } = await supabase
      .from('vehicles')
      .update({
        deleted_at: deletedAt,
        deleted_by: deletedBy,
        is_active: false,
      } as unknown as never)
      .eq('id', id)

    if (error) {
      if (error.message.includes('deleted_at')) {
        return {
          ok: false as const,
          error:
            'Falta aplicar la migración deleted_at en la tabla vehicles. Ejecute checklist/supabase/migrations/20260720_vehicle_deletion_audit.sql',
        }
      }
      return { ok: false as const, error: translateVehicleDbError(error.message, error.code) }
    }

    revalidatePath('/vehicles')
    revalidatePath('/inspections')
    revalidatePath('/dashboard')
    revalidatePath(`/vehicles/${id}`)
    return { ok: true as const, inspectionsDeleted: inspectionIds.length }
  } catch (err: any) {
    return { ok: false as const, error: err.message || 'Error del servidor' }
  }
}

// ─── Inspecciones (service role: RLS bloquea lecturas con cliente publishable) ─

function normalizePatenteKey(patente: string | null | undefined): string {
  return String(patente ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}

function normalizePersonName(name: string | null | undefined): string {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

type FieldSessionRow = {
  rut: string
  patente: string
  trabajador_id: string
  used_at: string
}

async function enrichInspectionsWithInspector(
  inspections: Inspection[]
): Promise<InspectionWithInspector[]> {
  if (inspections.length === 0) return []

  const supabase = createAdminClient()
  const missingIdentity = inspections.filter(
    ins => !(ins as InspectionWithInspector).responsable_rut
  )

  const sessionByInspection = new Map<string, FieldSessionRow>()

  if (missingIdentity.length > 0) {
    const patenteKeys = new Set(
      missingIdentity.map(ins => normalizePatenteKey(ins.patente)).filter(Boolean)
    )

    // check_field_sessions no está en Database tipado; se usa solo para enriquecer RUT
    const { data: sessionsData } = await (supabase as any)
      .from('check_field_sessions')
      .select('rut, patente, trabajador_id, used_at')
      .not('used_at', 'is', null)
      .order('used_at', { ascending: false })
      .limit(800)

    const sessions = (sessionsData as FieldSessionRow[] | null) ?? []

    for (const ins of missingIdentity) {
      const key = normalizePatenteKey(ins.patente)
      if (!patenteKeys.has(key)) continue
      const created = new Date(ins.created_at).getTime()
      let best: FieldSessionRow | null = null
      let bestDiff = Number.POSITIVE_INFINITY

      for (const sess of sessions) {
        if (normalizePatenteKey(sess.patente) !== key) continue
        const diff = Math.abs(new Date(sess.used_at).getTime() - created)
        if (diff < bestDiff) {
          bestDiff = diff
          best = sess
        }
      }

      // Solo asociar si la sesión se usó cerca del envío (±2 h)
      if (best && bestDiff <= 2 * 60 * 60 * 1000) {
        sessionByInspection.set(ins.id, best)
      }
    }
  }

  // Fallback: match trabajador por nombre completo cuando no hay sesión
  const needsNameLookup = missingIdentity.filter(ins => !sessionByInspection.has(ins.id))
  const rutByName = new Map<string, { rut: string; trabajador_id: string }>()

  if (needsNameLookup.length > 0) {
    const { data: trabajadores } = await supabase
      .from('trabajadores')
      .select('id_trabajador, numero_identificacion, nombre_1, nombre_2, apellido_paterno, apellido_materno')
      .eq('tipo_identificacion', 'RUT')
      .limit(2000)

    const rows = (trabajadores as Array<{
      id_trabajador: string
      numero_identificacion: string
      nombre_1: string
      nombre_2: string | null
      apellido_paterno: string
      apellido_materno: string | null
    }> | null) ?? []

    const byFullName = new Map<string, { rut: string; trabajador_id: string }>()
    for (const w of rows) {
      const full = normalizePersonName(
        [w.nombre_1, w.nombre_2, w.apellido_paterno, w.apellido_materno].filter(Boolean).join(' ')
      )
      if (full) {
        byFullName.set(full, {
          rut: w.numero_identificacion,
          trabajador_id: w.id_trabajador,
        })
      }
    }

    for (const ins of needsNameLookup) {
      const hit = byFullName.get(normalizePersonName(ins.responsable_inspeccion))
      if (hit) rutByName.set(ins.id, hit)
    }
  }

  return inspections.map(ins => {
    const base = ins as InspectionWithInspector
    if (base.responsable_rut) {
      return {
        ...base,
        responsable_rut: base.responsable_rut,
        trabajador_id: base.trabajador_id ?? null,
      }
    }

    const fromSession = sessionByInspection.get(ins.id)
    if (fromSession) {
      return {
        ...base,
        responsable_rut: fromSession.rut,
        trabajador_id: fromSession.trabajador_id,
      }
    }

    const fromName = rutByName.get(ins.id)
    if (fromName) {
      return {
        ...base,
        responsable_rut: fromName.rut,
        trabajador_id: fromName.trabajador_id,
      }
    }

    return {
      ...base,
      responsable_rut: null,
      trabajador_id: null,
    }
  })
}

export interface FetchInspectionsParams {
  vehicle?: string
  resultado?: string
  desde?: string
  hasta?: string
  limit?: number
}

export async function fetchInspections(
  params: FetchInspectionsParams = {}
): Promise<{ data: InspectionWithInspector[]; error: string | null }> {
  const supabase = createAdminClient()
  const vehicleKey = params.vehicle ? normalizePatente(params.vehicle) : ''

  let query = supabase
    .from('monitoring_inspections')
    .select('*')
    .order('fecha', { ascending: false })
    .order('hora', { ascending: false })
    .limit(params.limit ?? (params.vehicle ? 500 : 200))

  if (params.vehicle && vehicleKey) {
    const display = formatPatenteDisplay(vehicleKey)
    const variants = Array.from(
      new Set([params.vehicle.trim().toUpperCase(), display, vehicleKey].filter(Boolean))
    )
    query = query.or(variants.map(v => `patente.eq.${v}`).join(','))
  } else if (params.vehicle) {
    query = query.eq('patente', params.vehicle)
  }
  if (params.resultado) query = query.ilike('resultado', `%${params.resultado}%`)
  if (params.desde) query = query.gte('fecha', params.desde)
  if (params.hasta) query = query.lte('fecha', params.hasta)

  const { data, error } = await query
  if (error) return { data: [], error: error.message }

  let rows = (data as Inspection[]) ?? []
  if (vehicleKey) {
    rows = rows.filter(ins => normalizePatente(ins.patente) === vehicleKey)
  }

  // Orden estable: fecha desc, hora desc, created_at desc
  rows.sort((a, b) => {
    const fd = b.fecha.localeCompare(a.fecha)
    if (fd !== 0) return fd
    const hd = String(b.hora ?? '').localeCompare(String(a.hora ?? ''))
    if (hd !== 0) return hd
    return String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))
  })

  const enriched = await enrichInspectionsWithInspector(rows)
  const withHallazgos = await enrichInspectionsWithHallazgoCounts(enriched)
  return { data: withHallazgos, error: null }
}

async function enrichInspectionsWithHallazgoCounts(
  inspections: InspectionWithInspector[]
): Promise<InspectionWithInspector[]> {
  if (inspections.length === 0) return inspections

  const supabase = createAdminClient()
  const ids = inspections.map(i => i.id)
  const counts = new Map<string, { hallazgos: number; conFoto: number }>()

  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100)
    const { data } = await supabase
      .from('monitoring_inspection_details')
      .select('inspection_id, is_good, foto_url')
      .in('inspection_id', chunk)
      .eq('is_good', false)

    for (const row of (data as Array<{
      inspection_id: string
      is_good: boolean
      foto_url: string | null
    }> | null) ?? []) {
      const cur = counts.get(row.inspection_id) ?? { hallazgos: 0, conFoto: 0 }
      cur.hallazgos += 1
      if (row.foto_url) cur.conFoto += 1
      counts.set(row.inspection_id, cur)
    }
  }

  return inspections.map(ins => {
    const c = counts.get(ins.id)
    return {
      ...ins,
      hallazgos_count: c?.hallazgos ?? 0,
      hallazgos_con_foto: c?.conFoto ?? 0,
    }
  })
}

export type VehicleInspectionHistory = {
  inspections: InspectionWithInspector[]
  weeks: ReturnType<typeof groupInspectionsByWeek>
  inspectors: ReturnType<typeof summarizeInspectors>
  frequentProblems: Array<{
    itemKey: string
    itemLabel: string
    seccion: string
    count: number
    blockingCount: number
  }>
  stats: {
    total: number
    aptos: number
    noAptos: number
    lastFecha: string | null
    lastKm: number | null
  }
  error: string | null
}

export async function fetchVehicleInspectionHistory(
  patente: string,
  filters: { resultado?: string; desde?: string; hasta?: string } = {}
): Promise<VehicleInspectionHistory> {
  const empty: VehicleInspectionHistory = {
    inspections: [],
    weeks: [],
    inspectors: [],
    frequentProblems: [],
    stats: { total: 0, aptos: 0, noAptos: 0, lastFecha: null, lastKm: null },
    error: null,
  }

  const { data: inspections, error } = await fetchInspections({
    vehicle: patente,
    resultado: filters.resultado,
    desde: filters.desde,
    hasta: filters.hasta,
    limit: 500,
  })

  if (error) return { ...empty, error }

  const weeks = groupInspectionsByWeek(inspections)
  const inspectors = summarizeInspectors(inspections)
  const aptos = inspections.filter(i => isInspectionApto(i.resultado)).length

  const frequentProblems: VehicleInspectionHistory['frequentProblems'] = []
  if (inspections.length > 0) {
    const supabase = createAdminClient()
    const ids = inspections.map(i => i.id)
    // Supabase .in() has practical limits; chunk if needed
    const chunks: string[][] = []
    for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100))

    const map = new Map<string, VehicleInspectionHistory['frequentProblems'][number]>()
    for (const chunk of chunks) {
      const { data: faults } = await supabase
        .from('monitoring_inspection_details')
        .select('item_key, item_label, seccion, is_blocking, inspection_id')
        .in('inspection_id', chunk)
        .eq('is_good', false)

      for (const f of (faults as Array<{
        item_key: string
        item_label: string
        seccion: string
        is_blocking: boolean | null
        inspection_id: string
      }> | null) ?? []) {
        const key = f.item_key || f.item_label
        const row = map.get(key) ?? {
          itemKey: f.item_key,
          itemLabel: f.item_label,
          seccion: f.seccion,
          count: 0,
          blockingCount: 0,
        }
        row.count += 1
        if (f.is_blocking) row.blockingCount += 1
        map.set(key, row)
      }
    }
    frequentProblems.push(
      ...Array.from(map.values()).sort((a, b) => b.count - a.count || b.blockingCount - a.blockingCount)
    )
  }

  return {
    inspections,
    weeks,
    inspectors,
    frequentProblems: frequentProblems.slice(0, 12),
    stats: {
      total: inspections.length,
      aptos,
      noAptos: inspections.length - aptos,
      lastFecha: inspections[0]?.fecha ?? null,
      lastKm: inspections[0]?.kilometraje ?? null,
    },
    error: null,
  }
}

export async function fetchInspectionById(id: string): Promise<InspectionFull | null> {
  const supabase = createAdminClient()

  const [{ data: insData, error }, { data: detailsData }] = await Promise.all([
    supabase.from('monitoring_inspections').select('*').eq('id', id).single(),
    supabase
      .from('monitoring_inspection_details')
      .select('*')
      .eq('inspection_id', id)
      .order('seccion')
      .order('item_key'),
  ])

  if (error || !insData) return null

  const [enriched] = await enrichInspectionsWithInspector([insData as Inspection])

  const inspection: InspectionWithInspector = {
    ...enriched,
    firma_url: resolveVehiclePhotoUrl(enriched.firma_url) ?? enriched.firma_url,
    foto_frontal: resolveVehiclePhotoUrl(enriched.foto_frontal),
    foto_trasera: resolveVehiclePhotoUrl(enriched.foto_trasera),
    foto_lateral_der: resolveVehiclePhotoUrl(enriched.foto_lateral_der),
    foto_lateral_izq: resolveVehiclePhotoUrl(enriched.foto_lateral_izq),
  }

  const details = ((detailsData as InspectionDetail[]) ?? []).map(d => ({
    ...d,
    foto_url: resolveVehiclePhotoUrl(d.foto_url),
  }))

  const hallazgos = details.filter(d => !d.is_good)
  inspection.hallazgos_count = hallazgos.length
  inspection.hallazgos_con_foto = hallazgos.filter(d => d.foto_url).length

  return { inspection, details }
}

export async function fetchInspectionsByPatente(
  patente: string,
  limit = 20
): Promise<InspectionWithInspector[]> {
  const { data } = await fetchInspections({ vehicle: patente, limit })
  return data
}

export async function fetchInspectionResultCounts(desde: string): Promise<{
  total: number
  aptos: number
}> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('monitoring_inspections')
    .select('id, resultado')
    .gte('fecha', desde)

  if (error || !data) return { total: 0, aptos: 0 }

  const rows = data as Array<{ id: string; resultado: string }>
  const aptos = rows.filter(r => {
    const res = r.resultado?.toLowerCase() ?? ''
    return res.includes('apto') && !res.includes('no')
  }).length

  return { total: rows.length, aptos }
}

