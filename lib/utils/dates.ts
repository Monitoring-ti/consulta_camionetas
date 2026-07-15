import type { DocStatus, DocStatusInfo } from '@/types/app.types'

/**
 * Calcula los días que faltan para una fecha de vencimiento.
 * Negativo = ya venció.
 */
export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Calcula el estado semáforo de un documento según días restantes.
 * Verde: > 60 días
 * Amarillo: 1–60 días
 * Rojo: vencido (≤ 0)
 * Sin dato: sin fecha
 */
export function getDocStatus(dateStr: string | null | undefined): DocStatusInfo {
  if (!dateStr) {
    return { status: 'nodata', label: 'Sin fecha', daysLeft: null }
  }

  const days = daysUntil(dateStr)!

  if (days < 0) {
    return {
      status: 'danger',
      label: `Vencido hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}`,
      daysLeft: days,
    }
  }

  if (days === 0) {
    return { status: 'danger', label: 'Vence hoy', daysLeft: 0 }
  }

  if (days <= 60) {
    return {
      status: 'warning',
      label: `Vence en ${days} día${days !== 1 ? 's' : ''}`,
      daysLeft: days,
    }
  }

  return {
    status: 'ok',
    label: `Vence en ${days} días`,
    daysLeft: days,
  }
}

/**
 * Devuelve el peor estado entre varios DocStatus (para resumen).
 */
export function worstStatus(statuses: DocStatus[]): DocStatus {
  if (statuses.includes('danger')) return 'danger'
  if (statuses.includes('warning')) return 'warning'
  if (statuses.includes('ok')) return 'ok'
  return 'nodata'
}

/**
 * Formatea fecha ISO a formato legible en español (Chile).
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

/**
 * Formatea fecha y hora para mostrar en tabla.
 */
export function formatDateTime(dateStr: string, timeStr: string): string {
  return `${formatDate(dateStr)} ${timeStr.slice(0, 5)}`
}
