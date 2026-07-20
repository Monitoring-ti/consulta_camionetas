import { fetchInspectionById } from '@/app/actions'
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils/dates'
import { formatRut } from '@/lib/utils/formatters'
import { PhotoViewer, PhotoPlaceholder } from '@/components/inspections/PhotoViewer'
import HallazgoEvidence from '@/components/inspections/HallazgoEvidence'
import PrintReportButton from '@/components/inspections/PrintReportButton'
import Link from 'next/link'
import type { InspectionDetail } from '@/types/app.types'

const VEHICLE_PHOTO_SLOTS = [
  { key: 'foto_lateral_izq' as const, label: 'Lateral Izquierdo' },
  { key: 'foto_trasera' as const, label: 'Trasera' },
  { key: 'foto_lateral_der' as const, label: 'Lateral Derecho' },
  { key: 'foto_frontal' as const, label: 'Frontal' },
]

const FILTER_KEYS = ['vehicle', 'resultado', 'desde', 'hasta'] as const

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

function buildInspectionsHref(
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const qs = new URLSearchParams()
  for (const key of FILTER_KEYS) {
    const value = firstParam(searchParams[key])
    if (value) qs.set(key, value)
  }
  const query = qs.toString()
  return query ? `/inspections?${query}` : '/inspections'
}

export default async function InspectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id } = await params
  const filters = await searchParams
  const backHref = buildInspectionsHref(filters)
  const full = await fetchInspectionById(id)

  if (!full) return notFound()

  const { inspection: ins, details } = full
  const isApto =
    ins.resultado?.toLowerCase().includes('apto') &&
    !ins.resultado?.toLowerCase().includes('no')

  const sections = details.reduce<Record<string, InspectionDetail[]>>((acc, d) => {
    if (!acc[d.seccion]) acc[d.seccion] = []
    acc[d.seccion].push(d)
    return acc
  }, {})

  const hallazgos = details.filter(d => !d.is_good)
  const totalHallazgos = hallazgos.length
  const hallazgosBloqueantes = hallazgos.filter(d => d.is_blocking).length
  const hallazgosConFoto = hallazgos.filter(d => d.foto_url).length
  const vehiclePhotosPresent = VEHICLE_PHOTO_SLOTS.filter(s => ins[s.key]).length
  const hasFirma = Boolean(ins.firma_url)

  return (
    <div className="inspection-report">
      <div className="page-header">
        <div className="breadcrumb no-print">
          <Link href={backHref}>Inspecciones</Link>
          <span className="breadcrumb-sep">/</span>
          <span>
            {ins.patente} — {formatDate(ins.fecha)}
          </span>
        </div>
        <div className="print-only print-report-header">
          <div className="print-report-brand">MAT Monitoring</div>
          <div className="print-report-title">Reporte de inspección</div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <h1 className="page-title">Inspección — {ins.patente}</h1>
            <p className="page-subtitle">
              {ins.marca_modelo} · {formatDate(ins.fecha)} a las {ins.hora?.slice(0, 5)}
            </p>
            <div className="media-badges no-print" style={{ marginTop: 10 }}>
              <span className={`badge ${hasFirma ? 'badge-ok' : 'badge-nodata'}`}>
                {hasFirma ? 'Firma' : 'Sin firma'}
              </span>
              <span className={`badge ${vehiclePhotosPresent > 0 ? 'badge-ok' : 'badge-nodata'}`}>
                Apoyo {vehiclePhotosPresent}/4
              </span>
              {totalHallazgos > 0 && (
                <span className="badge badge-warning">
                  {totalHallazgos} hallazgo{totalHallazgos !== 1 ? 's' : ''}
                  {hallazgosConFoto > 0
                    ? ` · ${hallazgosConFoto} foto${hallazgosConFoto !== 1 ? 's' : ''}`
                    : ''}
                </span>
              )}
            </div>
          </div>
          <div className="inspection-detail-actions">
            <span
              className={`badge ${isApto ? 'badge-apto' : 'badge-no-apto'}`}
              style={{ padding: '8px 18px', fontSize: '0.9rem' }}
            >
              {ins.resultado}
            </span>
            <Link href={backHref} className="btn btn-secondary no-print">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Volver
            </Link>
            <PrintReportButton />
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="inspection-top-grid">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Datos de la Inspección</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { label: 'Patente', value: ins.patente },
                  { label: 'Vehículo', value: `${ins.marca_modelo} ${ins.anio}` },
                  { label: 'Realizada por', value: ins.responsable_inspeccion },
                  { label: 'RUT', value: ins.responsable_rut ? formatRut(ins.responsable_rut) : '—' },
                  { label: 'Cargo', value: ins.cargo || '—' },
                  { label: 'Fecha', value: formatDate(ins.fecha) },
                  { label: 'Hora', value: ins.hora?.slice(0, 5) },
                  {
                    label: 'Kilometraje',
                    value: `${ins.kilometraje?.toLocaleString('es-CL')} km`,
                  },
                  { label: 'Combustible', value: ins.nivel_combustible ?? '—' },
                  { label: 'Observaciones', value: ins.observaciones ?? '—' },
                ].map(item => (
                  <div key={item.label}>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                        marginBottom: 2,
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: '0.9rem',
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                        fontFamily:
                          item.label === 'RUT' ? 'ui-monospace, monospace' : undefined,
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="kpi-card danger">
              <div className="kpi-label">Hallazgos</div>
              <div className="kpi-value">{totalHallazgos}</div>
              <div className="kpi-sub">
                {hallazgosConFoto > 0
                  ? `${hallazgosConFoto} con foto de evidencia`
                  : 'items con problema'}
              </div>
            </div>
            {hallazgosBloqueantes > 0 && (
              <div className="kpi-card danger">
                <div className="kpi-label">Bloqueantes</div>
                <div className="kpi-value">{hallazgosBloqueantes}</div>
                <div className="kpi-sub">requieren atención inmediata</div>
              </div>
            )}
            <div className="card">
              <div className="card-header">
                <span className="card-title" style={{ fontSize: '0.8rem' }}>
                  Firma del inspector
                </span>
              </div>
              <div className="card-body" style={{ padding: 12 }}>
                {hasFirma ? (
                  <PhotoViewer
                    src={ins.firma_url!}
                    alt={`Firma — ${ins.responsable_inspeccion}`}
                    variant="signature"
                  />
                ) : (
                  <div className="photo-thumb photo-thumb--signature photo-thumb--empty">
                    <span className="photo-empty-msg">Sin firma registrada</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <HallazgoEvidence items={hallazgos} />

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <span className="card-title">Imágenes de apoyo</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {vehiclePhotosPresent} de 4 ángulos del vehículo
            </span>
          </div>
          <div className="card-body">
            <p
              className="no-print"
              style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 14 }}
            >
              Fotos generales capturadas durante la inspección (lateral, trasera y frontal).
            </p>
            <div className="photos-grid photos-grid--vehicle">
              {VEHICLE_PHOTO_SLOTS.map(slot => {
                const url = ins[slot.key]
                if (url) {
                  return (
                    <div key={slot.key}>
                      <PhotoViewer src={url} alt={`Apoyo: ${slot.label}`} label={slot.label} />
                    </div>
                  )
                }
                return <PhotoPlaceholder key={slot.key} label={slot.label} />
              })}
            </div>
          </div>
        </div>

        {Object.keys(sections).length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <span className="card-title">Checklist de Inspección</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {details.filter(d => d.is_good).length} OK · {totalHallazgos} con problemas
              </span>
            </div>
            <div className="card-body">
              {Object.entries(sections).map(([seccion, items]) => (
                <div key={seccion} className="checklist-section">
                  <div className="checklist-section-title">{seccion}</div>
                  {items.map(item => (
                    <div
                      key={item.id}
                      className={`checklist-item ${!item.is_good ? 'checklist-item--bad' : ''}`}
                    >
                      <div className="checklist-icon">
                        {item.is_good ? (
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--status-ok)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--status-danger)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          <span className="checklist-label">{item.item_label}</span>
                          {item.is_blocking && !item.is_good && (
                            <span className="checklist-blocking">BLOQUEANTE</span>
                          )}
                        </div>
                        {item.descripcion && (
                          <div className="checklist-desc">{item.descripcion}</div>
                        )}
                        {item.geotag && !item.is_good && (
                          <div className="checklist-desc" style={{ fontSize: '0.72rem' }}>
                            GPS: {item.geotag}
                          </div>
                        )}
                      </div>
                      {item.foto_url ? (
                        <div className="checklist-photo">
                          <PhotoViewer
                            src={item.foto_url}
                            alt={`Foto: ${item.item_label}`}
                            variant="sm"
                          />
                        </div>
                      ) : !item.is_good ? (
                        <span className="badge badge-nodata">Sin foto</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {details.length === 0 && (
          <div className="card">
            <div className="card-body empty-state">
              <p>Esta inspección no tiene detalles de checklist registrados.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
