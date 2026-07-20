import type { Database } from './database.types'

export type Vehicle = Database['public']['Tables']['vehicles']['Row']
export type VehicleInsert = Database['public']['Tables']['vehicles']['Insert']
export type VehicleUpdate = Database['public']['Tables']['vehicles']['Update']

export type Inspection = Database['public']['Tables']['monitoring_inspections']['Row']
export type InspectionDetail = Database['public']['Tables']['monitoring_inspection_details']['Row']
export type Inspector = Database['public']['Tables']['inspectors']['Row']
export type InspectorInsert = Database['public']['Tables']['inspectors']['Insert']
export type InspectorUpdate = Database['public']['Tables']['inspectors']['Update']

/** Inspección enriquecida para admin (RUT resuelto desde sesión/trabajador si falta en fila) */
export type InspectionWithInspector = Inspection & {
  responsable_rut: string | null
  trabajador_id: string | null
}

export interface InspectionFull {
  inspection: InspectionWithInspector
  details: InspectionDetail[]
}

// ─── Trabajadores — solo campos de documentos/vencimientos (no datos sensibles) ───
export interface TrabajadorDocVenc {
  id_trabajador: string
  numero_identificacion: string   // RUT
  nombre_1: string
  nombre_2: string | null
  apellido_paterno: string
  apellido_materno: string | null
  cargo: string | null
  area_departamento: string | null
  tipo_identificacion: string
  // Documentos (admin solo edita un subconjunto — ver DocVencPayload)
  vencimiento_licencia_conducir: string | null
  vencimiento_examen_ocupacional: string | null
  vencimiento_altura_geo: string | null
  vencimiento_psicosensometrico: string | null
  licencia_conducir_tipo: string | null
  licencia_conducir_numero: string | null
  numero_licencia_interna: string | null
  vencimiento_licencia_interna: string | null
}

/** Campos que el admin puede actualizar en trabajadores */
export type DocVencPayload = Pick<
  TrabajadorDocVenc,
  | 'vencimiento_licencia_conducir'
  | 'licencia_conducir_tipo'
  | 'vencimiento_psicosensometrico'
  | 'numero_licencia_interna'
  | 'vencimiento_licencia_interna'
>

// Estado de documento por vencimiento
export type DocStatus = 'ok' | 'warning' | 'danger' | 'nodata'

export interface DocStatusInfo {
  status: DocStatus
  label: string
  daysLeft: number | null
}

// Inspección con conteo de hallazgos (para la lista)
export interface InspectionWithStats extends Inspection {
  total_hallazgos: number
  hallazgos_bloqueantes: number
}

// Vehículo con estado de documentos calculado
export interface VehicleWithDocStatus extends Vehicle {
  docStatus: {
    revision_tecnica: DocStatusInfo
    seguro: DocStatusInfo
    permiso: DocStatusInfo
    extintor: DocStatusInfo
    torque: DocStatusInfo
    gps: DocStatusInfo
  }
  worstStatus: DocStatus
}

// KPIs del dashboard
export interface DashboardKPIs {
  vehiculosActivos: number
  inspeccionesUltimoMes: number
  porcentajeAptos: number
  vehiculosConDocVencido: number
  alertas30dias: AlertaVencimiento[]
  alertasVencidas: AlertaVencimiento[]
}

export interface AlertaVencimiento {
  vehicleId: string
  patente: string
  marca: string
  modelo: string
  campo: string
  fechaVencimiento: string
  daysLeft: number
}
