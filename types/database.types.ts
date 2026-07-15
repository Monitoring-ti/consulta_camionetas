// Tipos generados manualmente basados en el esquema real de Supabase
// Ejecutar: npx supabase gen types typescript --project-id <id> > types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      vehicles: {
        Row: {
          id: string
          created_at: string
          patente: string
          marca: string
          modelo: string
          anio: number
          km_actual: number | null
          is_active: boolean | null
          last_inspection_at: string | null
          fecha_revision_tecnica: string
          proveedor_arriendo: string
          certificado_torque_ruedas: string | null
          certificado_gps: string | null
          contrato_pertenece: string | null
          vencimiento_seguro: string | null
          vencimiento_permiso: string | null
          vencimiento_extintor: string | null
          vencimiento_torque_ruedas: string | null
          vencimiento_gps: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          patente: string
          marca: string
          modelo: string
          anio: number
          km_actual?: number | null
          is_active?: boolean | null
          last_inspection_at?: string | null
          fecha_revision_tecnica: string
          proveedor_arriendo: string
          certificado_torque_ruedas?: string | null
          certificado_gps?: string | null
          contrato_pertenece?: string | null
          vencimiento_seguro?: string | null
          vencimiento_permiso?: string | null
          vencimiento_extintor?: string | null
          vencimiento_torque_ruedas?: string | null
          vencimiento_gps?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          patente?: string
          marca?: string
          modelo?: string
          anio?: number
          km_actual?: number | null
          is_active?: boolean | null
          last_inspection_at?: string | null
          fecha_revision_tecnica?: string
          proveedor_arriendo?: string
          certificado_torque_ruedas?: string | null
          certificado_gps?: string | null
          contrato_pertenece?: string | null
          vencimiento_seguro?: string | null
          vencimiento_permiso?: string | null
          vencimiento_extintor?: string | null
          vencimiento_torque_ruedas?: string | null
          vencimiento_gps?: string | null
        }
      }
      monitoring_inspections: {
        Row: {
          id: string
          created_at: string
          fecha: string
          hora: string
          responsable_inspeccion: string
          cargo: string
          patente: string
          kilometraje: number
          marca_modelo: string
          anio: number
          observaciones: string | null
          resultado: string
          firma_url: string
          foto_frontal: string | null
          foto_trasera: string | null
          foto_lateral_der: string | null
          foto_lateral_izq: string | null
          /** Opcional: 1/8 | 1/4 | 1/2 | 3/4 | FULL */
          nivel_combustible: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          fecha: string
          hora: string
          responsable_inspeccion: string
          cargo: string
          patente: string
          kilometraje: number
          marca_modelo: string
          anio: number
          observaciones?: string | null
          resultado: string
          firma_url: string
          foto_frontal?: string | null
          foto_trasera?: string | null
          foto_lateral_der?: string | null
          foto_lateral_izq?: string | null
          nivel_combustible?: string | null
        }
        Update: Partial<Database['public']['Tables']['monitoring_inspections']['Insert']>
      }
      monitoring_inspection_details: {
        Row: {
          id: string
          created_at: string
          inspection_id: string
          seccion: string
          item_key: string
          item_label: string
          is_good: boolean
          descripcion: string | null
          foto_url: string | null
          geotag: string | null
          is_blocking: boolean | null
        }
        Insert: {
          id?: string
          created_at?: string
          inspection_id: string
          seccion: string
          item_key: string
          item_label: string
          is_good: boolean
          descripcion?: string | null
          foto_url?: string | null
          geotag?: string | null
          is_blocking?: boolean | null
        }
        Update: Partial<Database['public']['Tables']['monitoring_inspection_details']['Insert']>
      }
      monitoring_inspection_results: {
        Row: {
          id: string
          created_at: string
          inspection_id: string
          item_name: string
          is_good: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          inspection_id: string
          item_name: string
          is_good: boolean
        }
        Update: Partial<Database['public']['Tables']['monitoring_inspection_results']['Insert']>
      }
      inspectors: {
        Row: {
          id: string
          created_at: string
          nombre: string
          cargo: string
          rut: string | null
          tipo_usuario: string | null
          is_active: boolean | null
          telefono: string | null
          vencimiento_licencia_municipal: string | null
          vencimiento_licencia_interna: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          nombre: string
          cargo: string
          rut?: string | null
          tipo_usuario?: string | null
          is_active?: boolean | null
          telefono?: string | null
          vencimiento_licencia_municipal?: string | null
          vencimiento_licencia_interna?: string | null
        }
        Update: Partial<Database['public']['Tables']['inspectors']['Insert']>
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
  }
}
