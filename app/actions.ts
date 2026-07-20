'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizePatente } from '@/lib/utils/patente'
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
].join(', ')

// ─── Obtener todos los trabajadores (solo docs) ───────────────────────────────
export async function fetchWorkers(): Promise<TrabajadorDocVenc[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('trabajadores')
    .select(WORKER_SELECT)
    .eq('tipo_identificacion', 'RUT')
    .order('apellido_paterno')

  if (error) throw new Error(error.message)
  return (data ?? []) as TrabajadorDocVenc[]
}

// ─── Buscar trabajador por RUT ────────────────────────────────────────────────
export async function findWorkerByRut(rut: string): Promise<TrabajadorDocVenc | null> {
  const supabase = createAdminClient()
  const normalizedRut = rut.replace(/[^0-9kK]/g, '').toUpperCase()

  const { data, error } = await supabase
    .from('trabajadores')
    .select(WORKER_SELECT)
    .eq('tipo_identificacion', 'RUT')
    .ilike('numero_identificacion', `%${normalizedRut}%`)
    .limit(1)
    .single()

  if (error || !data) return null
  return data as TrabajadorDocVenc
}

// ─── Actualizar solo vencimientos de documentos ────────────────────────────────
export async function updateWorkerDocuments(
  id_trabajador: string,
  payload: Partial<DocVencPayload>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { error } = await (supabase.from('trabajadores') as any)
      .update(payload)
      .eq('id_trabajador', id_trabajador)

    if (error) return { ok: false, error: error.message }
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

  // Fecha límite: hoy + 60 días
  const hoy = new Date()
  const limite = new Date(hoy)
  limite.setDate(limite.getDate() + 60)
  const limiteStr = limite.toISOString().split('T')[0]
  const hoyStr = hoy.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('trabajadores')
    .select(`
      id_trabajador,
      nombre_1, apellido_paterno,
      numero_identificacion,
      cargo,
      area_departamento,
      vencimiento_licencia_conducir,
      vencimiento_examen_ocupacional,
      vencimiento_altura_geo,
      vencimiento_psicosensometrico
    `)
    .eq('tipo_identificacion', 'RUT')

  if (error || !data) return []

  const campos: { key: string; label: string }[] = [
    { key: 'vencimiento_licencia_conducir', label: 'Licencia Conducir' },
    { key: 'vencimiento_examen_ocupacional', label: 'Examen Ocupacional' },
    { key: 'vencimiento_altura_geo', label: 'Altura/Geo' },
    { key: 'vencimiento_psicosensometrico', label: 'Psicosensométrico' },
  ]

  const alertas: AlertaDocVenc[] = []

  for (const row of data as any[]) {
    for (const { key, label } of campos) {
      const fecha = row[key] as string | null
      if (!fecha) continue

      const fechaDate = new Date(fecha)
      fechaDate.setHours(0, 0, 0, 0)
      hoy.setHours(0, 0, 0, 0)
      const daysLeft = Math.ceil((fechaDate.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))

      // Solo incluir si vence en los próximos 60 días o ya venció
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

  // Ordenar: vencidos primero, luego por días restantes
  return alertas.sort((a, b) => a.daysLeft - b.daysLeft)
}

// ─── Vehículos (service role: RLS bloquea lecturas con cliente autenticado) ───
export async function fetchVehicles(options?: {
  activeOnly?: boolean
}): Promise<Vehicle[]> {
  const supabase = createAdminClient()
  let query = supabase.from('vehicles').select('*').order('patente')

  if (options?.activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
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
    .single()

  if (error || !data) return null
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
      return { ok: false as const, error: 'Vehículo no encontrado.' }
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
  let query = supabase
    .from('monitoring_inspections')
    .select('*')
    .order('fecha', { ascending: false })
    .order('hora', { ascending: false })
    .limit(params.limit ?? 200)

  if (params.vehicle) query = query.eq('patente', params.vehicle)
  if (params.resultado) query = query.ilike('resultado', `%${params.resultado}%`)
  if (params.desde) query = query.gte('fecha', params.desde)
  if (params.hasta) query = query.lte('fecha', params.hasta)

  const { data, error } = await query
  if (error) return { data: [], error: error.message }

  const enriched = await enrichInspectionsWithInspector((data as Inspection[]) ?? [])
  return { data: enriched, error: null }
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
  return {
    inspection: enriched,
    details: (detailsData as InspectionDetail[]) ?? [],
  }
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

