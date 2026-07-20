import { normalizePatente } from '@/lib/utils/patente'
import type { InspectionWithInspector } from '@/types/app.types'

export type WeekGroup = {
  key: string
  label: string
  weekStart: string
  weekEnd: string
  inspections: InspectionWithInspector[]
}

export type InspectorStat = {
  name: string
  rut: string | null
  cargo: string | null
  count: number
  aptos: number
  noAptos: number
}

export type FrequentProblem = {
  itemKey: string
  itemLabel: string
  seccion: string
  count: number
  blockingCount: number
}

function parseFecha(fecha: string): Date {
  return new Date(`${fecha}T12:00:00`)
}

/** ISO week key + human label (lunes–domingo) */
export function getWeekMeta(fecha: string): { key: string; label: string; weekStart: string; weekEnd: string } {
  const d = parseFecha(fecha)
  const day = d.getDay() || 7 // domingo = 7
  const monday = new Date(d)
  monday.setDate(d.getDate() - day + 1)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const thursday = new Date(monday)
  thursday.setDate(monday.getDate() + 3)
  const yearStart = new Date(thursday.getFullYear(), 0, 1)
  const weekNo = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  const year = thursday.getFullYear()

  const fmt = (x: Date) =>
    x.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })

  const weekStart = monday.toISOString().slice(0, 10)
  const weekEnd = sunday.toISOString().slice(0, 10)

  return {
    key: `${year}-W${String(weekNo).padStart(2, '0')}`,
    label: `Semana ${weekNo} · ${fmt(monday)} – ${fmt(sunday)} ${year}`,
    weekStart,
    weekEnd,
  }
}

export function groupInspectionsByWeek(
  inspections: InspectionWithInspector[]
): WeekGroup[] {
  const map = new Map<string, WeekGroup>()

  for (const ins of inspections) {
    const meta = getWeekMeta(ins.fecha)
    const existing = map.get(meta.key)
    if (existing) {
      existing.inspections.push(ins)
    } else {
      map.set(meta.key, {
        key: meta.key,
        label: meta.label,
        weekStart: meta.weekStart,
        weekEnd: meta.weekEnd,
        inspections: [ins],
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => b.weekStart.localeCompare(a.weekStart))
}

export function summarizeInspectors(
  inspections: InspectionWithInspector[]
): InspectorStat[] {
  const map = new Map<string, InspectorStat>()

  for (const ins of inspections) {
    const name = (ins.responsable_inspeccion || 'Sin responsable').trim()
    const rut = ins.responsable_rut ?? null
    const key = `${normalizePatente(rut ?? '')}|${name.toLowerCase()}`
    const isApto =
      ins.resultado?.toLowerCase().includes('apto') &&
      !ins.resultado?.toLowerCase().includes('no')

    const row = map.get(key) ?? {
      name,
      rut,
      cargo: ins.cargo || null,
      count: 0,
      aptos: 0,
      noAptos: 0,
    }
    row.count += 1
    if (isApto) row.aptos += 1
    else row.noAptos += 1
    if (!row.cargo && ins.cargo) row.cargo = ins.cargo
    if (!row.rut && rut) row.rut = rut
    map.set(key, row)
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count)
}

export function isInspectionApto(resultado: string | null | undefined): boolean {
  const res = resultado?.toLowerCase() ?? ''
  return res.includes('apto') && !res.includes('no')
}

export function matchPatente(a: string, b: string): boolean {
  return normalizePatente(a) === normalizePatente(b)
}
