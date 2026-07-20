import Link from 'next/link'
import ChileanPlate from '@/components/vehicles/ChileanPlate'
import PrintReportButton from '@/components/inspections/PrintReportButton'
import { formatChileDayLong } from '@/lib/utils/chile-date'
import { isInspectionApto } from '@/lib/utils/inspection-history'
import { normalizePatente } from '@/lib/utils/patente'
import type { InspectionWithInspector, Vehicle } from '@/types/app.types'

export type DailyVehicleRef = {
  id: string
  patente: string
  marca: string
  modelo: string
  isActive: boolean
}

export type DailyRow = {
  vehicle: DailyVehicleRef
  inspection: InspectionWithInspector | null
}

type Props = {
  day: string
  rows: DailyRow[]
  resultadoFilter?: string
}

function shortEstado(resultado: string | null | undefined): { label: string; apto: boolean } {
  const apto = isInspectionApto(resultado)
  return { label: apto ? 'Apto' : 'No apto', apto }
}

function detailHref(id: string, day: string) {
  return `/inspections/${id}?desde=${day}&hasta=${day}`
}

export default function DailyInspectionsReport({ day, rows, resultadoFilter }: Props) {
  const inspected = rows.filter(r => r.inspection)
  const pending = rows.filter(r => !r.inspection)

  let shown = inspected
  if (resultadoFilter === 'Apto') {
    shown = inspected.filter(r => isInspectionApto(r.inspection!.resultado))
  } else if (resultadoFilter === 'No Apto') {
    shown = inspected.filter(r => !isInspectionApto(r.inspection!.resultado))
  }

  shown = [...shown].sort((a, b) => {
    const ha = a.inspection?.hora ?? ''
    const hb = b.inspection?.hora ?? ''
    return hb.localeCompare(ha)
  })

  const aptos = inspected.filter(r => isInspectionApto(r.inspection!.resultado)).length
  const noAptos = inspected.length - aptos
  const dayLabel = formatChileDayLong(day)

  return (
    <div className="daily-report">
      <div className="daily-report-toolbar no-print">
        <div>
          <h2 className="daily-report-heading">Resumen del día</h2>
          <p className="daily-report-day">{dayLabel}</p>
        </div>
        <PrintReportButton />
      </div>

      <div className="print-only print-report-header" style={{ marginBottom: 16 }}>
        <div className="print-report-brand">MAT Monitoring</div>
        <div className="print-report-title">Resumen diario de inspecciones</div>
        <div className="page-subtitle" style={{ textTransform: 'capitalize' }}>
          {dayLabel}
        </div>
      </div>

      <div className="daily-kpis">
        <div className="daily-kpi">
          <span className="daily-kpi-value">{inspected.length}</span>
          <span className="daily-kpi-label">Inspeccionadas</span>
        </div>
        <div className="daily-kpi daily-kpi--ok">
          <span className="daily-kpi-value">{aptos}</span>
          <span className="daily-kpi-label">Aptas</span>
        </div>
        <div className="daily-kpi daily-kpi--bad">
          <span className="daily-kpi-value">{noAptos}</span>
          <span className="daily-kpi-label">No aptas</span>
        </div>
        <div className="daily-kpi daily-kpi--pending">
          <span className="daily-kpi-value">{pending.length}</span>
          <span className="daily-kpi-label">Sin inspección</span>
        </div>
      </div>

      <section className="daily-section">
        <div className="daily-section-head">
          <h3 className="daily-section-title">Inspecciones del día</h3>
          <span className="daily-section-meta">{shown.length}</span>
        </div>

        {shown.length === 0 ? (
          <div className="daily-empty card">
            <p>
              No hay inspecciones registradas para este día
              {resultadoFilter ? ' con ese filtro' : ''}.
            </p>
          </div>
        ) : (
          <div className="daily-list">
            {shown.map(({ vehicle, inspection }) => {
              const ins = inspection!
              const estado = shortEstado(ins.resultado)
              const hallazgos = ins.hallazgos_count ?? 0
              return (
                <article
                  key={ins.id}
                  className={`daily-row ${estado.apto ? 'daily-row--ok' : 'daily-row--bad'}`}
                >
                  <div className="daily-row-plate">
                    <Link
                      href={`/inspections?vehicle=${encodeURIComponent(vehicle.patente)}`}
                      title="Ver historial de la patente"
                      className="daily-plate-link"
                    >
                      <ChileanPlate patente={vehicle.patente} size="sm" />
                    </Link>
                    <div className="daily-row-vehicle no-print">
                      {vehicle.marca} {vehicle.modelo}
                    </div>
                  </div>

                  <div className="daily-row-field">
                    <span className="daily-field-label">Chofer</span>
                    <span className="daily-field-value">{ins.responsable_inspeccion || '—'}</span>
                  </div>

                  <div className="daily-row-field daily-row-field--time">
                    <span className="daily-field-label">Hora</span>
                    <span className="daily-field-value daily-field-value--mono">
                      {ins.hora?.slice(0, 5) || '—'}
                    </span>
                  </div>

                  <div className="daily-row-field daily-row-field--status">
                    <span className="daily-field-label">Estado</span>
                    <span className={`daily-status ${estado.apto ? 'is-ok' : 'is-bad'}`}>
                      {estado.label}
                    </span>
                    {hallazgos > 0 && (
                      <span className="daily-hallazgos no-print">
                        {hallazgos} hallazgo{hallazgos !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="daily-row-actions no-print">
                    <Link href={detailHref(ins.id, day)} className="btn btn-secondary btn-sm">
                      Ver
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {pending.length > 0 && !resultadoFilter && (
        <section className="daily-section daily-section--pending">
          <div className="daily-section-head">
            <h3 className="daily-section-title">Sin inspección hoy</h3>
            <span className="daily-section-meta">{pending.length}</span>
          </div>
          <div className="daily-pending-grid">
            {pending.map(({ vehicle }) => (
              <div key={vehicle.id} className="daily-pending-item">
                <ChileanPlate patente={vehicle.patente} size="sm" muted />
                <span className="daily-pending-name">
                  {vehicle.marca} {vehicle.modelo}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/** Une flota activa + última inspección del día por patente. */
export function buildDailyRows(
  vehicles: Vehicle[],
  inspections: InspectionWithInspector[],
): DailyRow[] {
  const byPatente = new Map<string, InspectionWithInspector>()

  for (const ins of inspections) {
    const key = normalizePatente(ins.patente)
    if (!key) continue
    const prev = byPatente.get(key)
    if (!prev) {
      byPatente.set(key, ins)
      continue
    }
    const newer =
      String(ins.hora ?? '').localeCompare(String(prev.hora ?? '')) > 0 ||
      (ins.hora === prev.hora &&
        String(ins.created_at ?? '').localeCompare(String(prev.created_at ?? '')) > 0)
    if (newer) byPatente.set(key, ins)
  }

  const active = vehicles
    .filter(v => v.is_active !== false)
    .sort((a, b) => a.patente.localeCompare(b.patente, 'es'))

  const rows: DailyRow[] = active.map(vehicle => ({
    vehicle: {
      id: vehicle.id,
      patente: vehicle.patente,
      marca: vehicle.marca,
      modelo: vehicle.modelo,
      isActive: true,
    },
    inspection: byPatente.get(normalizePatente(vehicle.patente)) ?? null,
  }))

  const covered = new Set(rows.map(r => normalizePatente(r.vehicle.patente)))
  for (const [key, ins] of byPatente) {
    if (covered.has(key)) continue
    const parts = (ins.marca_modelo || '').trim().split(/\s+/)
    rows.push({
      vehicle: {
        id: `orphan-${ins.id}`,
        patente: ins.patente,
        marca: parts[0] || '—',
        modelo: parts.slice(1).join(' ') || '',
        isActive: false,
      },
      inspection: ins,
    })
  }

  return rows
}
