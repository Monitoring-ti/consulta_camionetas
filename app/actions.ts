'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { TrabajadorDocVenc, DocVencPayload } from '@/types/app.types'

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

// ─── Vehicle/Inspector actions (existing) ─────────────────────────────────────
export async function saveVehicleAction(mode: 'create' | 'edit', id: string | undefined, payload: any) {
  try {
    const supabase = createAdminClient()
    let result
    if (mode === 'create') {
      result = await (supabase.from('vehicles') as any).insert(payload).select().single()
    } else {
      if (!id) throw new Error('ID is required for editing')
      result = await (supabase.from('vehicles') as any).update(payload).eq('id', id).select().single()
    }

    if (result.error) {
      return { ok: false, error: result.error.message }
    }
    return { ok: true, data: result.data }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Error del servidor' }
  }
}

export async function deleteVehicleAction(id: string) {
  try {
    const supabase = createAdminClient()
    const { error } = await (supabase.from('vehicles') as any).update({ is_active: false }).eq('id', id)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Error del servidor' }
  }
}

