import Link from 'next/link'
import { formatDate } from '@/lib/utils/dates'
import { formatRut } from '@/lib/utils/formatters'
import { isInspectionApto } from '@/lib/utils/inspection-history'
import type { VehicleInspectionHistory } from '@/app/actions'
import type { InspectionWithInspector } from '@/types/app.types'
import ChileanPlate from '@/components/vehicles/ChileanPlate'

function mediaCounts(ins: InspectionWithInspector) {
  const photos = [
    ins.foto_frontal,
    ins.foto_trasera,
    ins.foto_lateral_der,
    ins.foto_lateral_izq,
  ].filter(Boolean).length
  return { hasFirma: Boolean(ins.firma_url), photos }
}

function detailHref(
  id: string,
  filters: { vehicle?: string; resultado?: string; desde?: string; hasta?: string },
) {
  const qs = new URLSearchParams()
  if (filters.vehicle) qs.set('vehicle', filters.vehicle)
  if (filters.resultado) qs.set('resultado', filters.resultado)
  if (filters.desde) qs.set('desde', filters.desde)
  if (filters.hasta) qs.set('hasta', filters.hasta)
  const query = qs.toString()
  return query ? `/inspections/${id}?${query}` : `/inspections/${id}`
}

type Props = {
  history: VehicleInspectionHistory
  patente: string
  filters: { vehicle?: string; resultado?: string; desde?: string; hasta?: string }
}

export default function VehicleInspectionHistoryView({ history, patente, filters }: Props) {
  const { stats, weeks, inspectors, frequentProblems, inspections } = history
  const maxProblem = frequentProblems[0]?.count ?? 1

  return (
    <div className="vehicle-history">
      <div className="vehicle-history-hero">
        <ChileanPlate patente={patente} size="md" />
        <div>
          <h2 className="vehicle-history-title">
            {inspections[0]?.marca_modelo ?? 'Historial del vehículo'}
            {inspections[0]?.anio ? ` · ${inspections[0].anio}` : ''}
          </h2>
          <p className="vehicle-history-sub">
            Ordenado por fecha (más reciente primero) · {stats.total} inspección
            {stats.total !== 1 ? 'es' : ''}
            {stats.lastFecha ? ` · última ${formatDate(stats.lastFecha)}` : ''}
            {stats.lastKm != null ? ` · ${stats.lastKm.toLocaleString('es-CL')} km` : ''}
          </p>
        </div>
      </div>

      <div className="history-stats">
        <div className="history-stat">
          <span className="history-stat-value">{stats.total}</span>
          <span className="history-stat-label">Total</span>
        </div>
        <div className="history-stat">
          <span className="history-stat-value history-stat-ok">{stats.aptos}</span>
          <span className="history-stat-label">Aptas</span>
        </div>
        <div className="history-stat">
          <span className="history-stat-value history-stat-bad">{stats.noAptos}</span>
          <span className="history-stat-label">No aptas</span>
        </div>
        <div className="history-stat">
          <span className="history-stat-value">{weeks.length}</span>
          <span className="history-stat-label">Semanas</span>
        </div>
        <div className="history-stat">
          <span className="history-stat-value">{inspectors.length}</span>
          <span className="history-stat-label">Inspectores</span>
        </div>
      </div>

      <div className="history-panels">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Quién realizó las inspecciones</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {inspectors.length === 0 ? (
              <p className="history-empty">Sin datos de responsables</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Responsable</th>
                      <th>Cantidad</th>
                      <th>Aptas</th>
                      <th>No aptas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectors.map(ins => (
                      <tr key={`${ins.name}-${ins.rut ?? ''}`}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{ins.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {ins.rut ? formatRut(ins.rut) : 'Sin RUT'}
                            {ins.cargo ? ` · ${ins.cargo}` : ''}
                          </div>
                        </td>
                        <td className="primary">{ins.count}</td>
                        <td>{ins.aptos}</td>
                        <td>{ins.noAptos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Problemas frecuentes</span>
          </div>
          <div className="card-body">
            {frequentProblems.length === 0 ? (
              <p className="history-empty">No hay hallazgos negativos en el historial filtrado</p>
            ) : (
              <ul className="problem-list">
                {frequentProblems.map(p => (
                  <li key={p.itemKey} className="problem-item">
                    <div className="problem-meta">
                      <span className="problem-label">{p.itemLabel}</span>
                      <span className="problem-section">{p.seccion}</span>
                    </div>
                    <div className="problem-bar-track">
                      <div
                        className="problem-bar-fill"
                        style={{ width: `${Math.max(8, (p.count / maxProblem) * 100)}%` }}
                      />
                    </div>
                    <div className="problem-count">
                      <strong>{p.count}</strong>
                      {p.blockingCount > 0 && (
                        <span className="badge badge-danger" title="Observaciones bloqueantes">
                          {p.blockingCount} bloq.
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="history-weeks">
        <h3 className="history-section-title">Historial por semana</h3>
        {weeks.length === 0 ? (
          <div className="card">
            <div className="empty-state" style={{ padding: 32 }}>
              <p>No hay inspecciones para esta patente con los filtros actuales</p>
            </div>
          </div>
        ) : (
          weeks.map(week => (
            <div key={week.key} className="card week-card">
              <div className="card-header week-header">
                <span className="card-title">{week.label}</span>
                <span className="badge badge-nodata">
                  {week.inspections.length} inspección
                  {week.inspections.length !== 1 ? 'es' : ''}
                </span>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Hora</th>
                      <th>Realizada por</th>
                      <th>Km</th>
                      <th>Evidencia</th>
                      <th>Resultado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {week.inspections.map(ins => {
                      const apto = isInspectionApto(ins.resultado)
                      const media = mediaCounts(ins)
                      return (
                        <tr key={ins.id}>
                          <td className="primary">{formatDate(ins.fecha)}</td>
                          <td>{ins.hora?.slice(0, 5)}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>
                              {ins.responsable_inspeccion || '—'}
                            </div>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                fontFamily: 'ui-monospace, monospace',
                              }}
                            >
                              {ins.responsable_rut ? formatRut(ins.responsable_rut) : 'Sin RUT'}
                              {ins.cargo ? ` · ${ins.cargo}` : ''}
                            </div>
                          </td>
                          <td>{ins.kilometraje?.toLocaleString('es-CL')}</td>
                          <td>
                            <div className="media-badges">
                              <span
                                className={`badge ${media.hasFirma ? 'badge-ok' : 'badge-nodata'}`}
                              >
                                Firma
                              </span>
                              <span
                                className={`badge ${media.photos > 0 ? 'badge-ok' : 'badge-nodata'}`}
                              >
                                {media.photos}/4 apoyo
                              </span>
                              {(ins.hallazgos_count ?? 0) > 0 && (
                                <span className="badge badge-warning">
                                  {(ins.hallazgos_con_foto ?? 0) > 0
                                    ? `${ins.hallazgos_con_foto} foto hallazgo`
                                    : `${ins.hallazgos_count} problema${(ins.hallazgos_count ?? 0) !== 1 ? 's' : ''}`}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${apto ? 'badge-apto' : 'badge-no-apto'}`}>
                              {ins.resultado}
                            </span>
                          </td>
                          <td>
                            <Link
                              href={detailHref(ins.id, filters)}
                              className="btn btn-secondary btn-sm"
                            >
                              Ver
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
