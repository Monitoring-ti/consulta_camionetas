import {
  fetchInspections,
  fetchVehicles,
} from '@/app/actions'
import { formatDate } from '@/lib/utils/dates'
import { formatRut } from '@/lib/utils/formatters'
import Link from 'next/link'
import type { InspectionWithInspector } from '@/types/app.types'

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

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicle?: string; resultado?: string; desde?: string; hasta?: string }>
}) {
  const params = await searchParams

  const [{ data: inspections, error }, vehicleList] = await Promise.all([
    fetchInspections({
      vehicle: params.vehicle,
      resultado: params.resultado,
      desde: params.desde,
      hasta: params.hasta,
    }),
    fetchVehicles(),
  ])

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Inspecciones</h1>
        <p className="page-subtitle">{inspections.length} registros encontrados</p>
      </div>

      <div className="page-body">
        <form method="GET" className="filters-bar" style={{ marginBottom: 20 }}>
          <select name="vehicle" className="form-select" defaultValue={params.vehicle ?? ''} style={{ minWidth: 220 }}>
            <option value="">Todos los vehículos</option>
            {vehicleList.map(v => (
              <option key={v.patente} value={v.patente}>
                {v.patente} — {v.marca} {v.modelo}
              </option>
            ))}
          </select>
          <select name="resultado" className="form-select" defaultValue={params.resultado ?? ''}>
            <option value="">Todos los resultados</option>
            <option value="Apto">Apto</option>
            <option value="No Apto">No Apto</option>
          </select>
          <input name="desde" type="date" className="form-input" defaultValue={params.desde ?? ''} style={{ width: 160 }} />
          <input name="hasta" type="date" className="form-input" defaultValue={params.hasta ?? ''} style={{ width: 160 }} />
          <button type="submit" className="btn btn-primary btn-sm">Filtrar</button>
          <Link href="/inspections" className="btn btn-secondary btn-sm">Limpiar</Link>
        </form>

        {error && (
          <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>
        )}

        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Patente</th>
                  <th>Vehículo</th>
                  <th>Realizada por</th>
                  <th>Km</th>
                  <th>Evidencia</th>
                  <th>Resultado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {inspections.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="empty-state">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                        </svg>
                        <p>No se encontraron inspecciones</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  inspections.map(ins => {
                    const isApto = ins.resultado?.toLowerCase().includes('apto') && !ins.resultado?.toLowerCase().includes('no')
                    const media = mediaCounts(ins)
                    return (
                      <tr key={ins.id}>
                        <td className="primary">{formatDate(ins.fecha)}</td>
                        <td>{ins.hora?.slice(0, 5)}</td>
                        <td className="primary" style={{ fontWeight: 700, letterSpacing: '0.05em' }}>{ins.patente}</td>
                        <td>{ins.marca_modelo}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{ins.responsable_inspeccion || '—'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace' }}>
                            {ins.responsable_rut ? formatRut(ins.responsable_rut) : 'Sin RUT'}
                            {ins.cargo ? ` · ${ins.cargo}` : ''}
                          </div>
                        </td>
                        <td>{ins.kilometraje?.toLocaleString('es-CL')}</td>
                        <td>
                          <div className="media-badges">
                            <span
                              className={`badge ${media.hasFirma ? 'badge-ok' : 'badge-nodata'}`}
                              title={media.hasFirma ? 'Firma registrada' : 'Sin firma'}
                            >
                              Firma
                            </span>
                            <span
                              className={`badge ${media.photos > 0 ? 'badge-ok' : 'badge-nodata'}`}
                              title={`${media.photos} de 4 imágenes de apoyo`}
                            >
                              {media.photos}/4 apoyo
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${isApto ? 'badge-apto' : 'badge-no-apto'}`}>
                            {ins.resultado}
                          </span>
                        </td>
                        <td>
                          <Link href={detailHref(ins.id, params)} className="btn btn-secondary btn-sm">
                            Ver
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
