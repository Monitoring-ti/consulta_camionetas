import type { Database } from './database.types'

export type Vehicle = Database['public']['Tables']['vehicles']['Row']
export type VehicleInsert = Database['public']['Tables']['vehicles']['Insert']
export type VehicleUpdate = Database['public']['Tables']['vehicles']['Update']

export type Inspection = Database['public']['Tables']['monitoring_inspections']['Row']
export type InspectionDetail = Database['public']['Tables']['monitoring_inspection_details']['Row']
export type Inspector = Database['public']['Tables']['inspectors']['Row']
export type InspectorInsert = Database['public']['Tables']['inspectors']['Insert']
export type InspectorUpdate = Database['public']['Tables']['inspectors']['Update']

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
