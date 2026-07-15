import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils/dates'
import { PhotoViewer } from '@/components/inspections/PhotoViewer'
import Link from 'next/link'
import type { Inspection, InspectionDetail } from '@/types/app.types'

export default async function InspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: insData, error }, { data: detailsData }] = await Promise.all([
    supabase.from('monitoring_inspections').select('*').eq('id', id).single(),
    supabase
      .from('monitoring_inspection_details')
      .select('*')
      .eq('inspection_id', id)
      .order('seccion')
      .order('item_key'),
  ])

  if (error || !insData) return notFound()

  const ins = insData as Inspection
  const details: InspectionDetail[] = (detailsData as InspectionDetail[]) ?? []
  const isApto = ins.resultado?.toLowerCase().includes('apto') && !ins.resultado?.toLowerCase().includes('no')

  // Agrupar por sección
  const sections = details.reduce<Record<string, InspectionDetail[]>>((acc, d) => {
    if (!acc[d.seccion]) acc[d.seccion] = []
    acc[d.seccion].push(d)
    return acc
  }, {})

  const totalHallazgos = details.filter(d => !d.is_good).length
  const hallazgosBloqueantes = details.filter(d => !d.is_good && d.is_blocking).length

  // Fotos generales (orden campo: izquierda → trasera → derecha → frontal)
  const fotosGenerales = [
    { url: ins.foto_lateral_izq, label: 'Lateral Izquierdo' },
    { url: ins.foto_trasera, label: 'Trasera' },
    { url: ins.foto_lateral_der, label: 'Lateral Derecho' },
    { url: ins.foto_frontal, label: 'Frontal' },
  ].filter(f => f.url)

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb">
          <Link href="/inspections">Inspecciones</Link>
          <span className="breadcrumb-sep">/</span>
          <span>{ins.patente} — {formatDate(ins.fecha)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Inspección — {ins.patente}</h1>
            <p className="page-subtitle">{ins.marca_modelo} · {formatDate(ins.fecha)} a las {ins.hora?.slice(0, 5)}</p>
          </div>
          <span className={`badge ${isApto ? 'badge-apto' : 'badge-no-apto'}`} style={{ padding: '8px 18px', fontSize: '0.9rem' }}>
            {ins.resultado}
          </span>
        </div>
      </div>

      <div className="page-body">
        {/* Cabecera */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Datos de la Inspección</span></div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { label: 'Patente', value: ins.patente },
                  { label: 'Vehículo', value: `${ins.marca_modelo} ${ins.anio}` },
                  { label: 'Responsable', value: ins.responsable_inspeccion },
                  { label: 'Cargo', value: ins.cargo },
                  { label: 'Fecha', value: formatDate(ins.fecha) },
                  { label: 'Hora', value: ins.hora?.slice(0, 5) },
                  { label: 'Kilometraje', value: `${ins.kilometraje?.toLocaleString('es-CL')} km` },
                  { label: 'Combustible', value: ins.nivel_combustible ?? '—' },
                  { label: 'Observaciones', value: ins.observaciones ?? '—' },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* KPIs */}
            <div className="kpi-card danger">
              <div className="kpi-label">Hallazgos</div>
              <div className="kpi-value">{totalHallazgos}</div>
              <div className="kpi-sub">items con problema</div>
            </div>
            {hallazgosBloqueantes > 0 && (
              <div className="kpi-card danger">
                <div className="kpi-label">Bloqueantes</div>
                <div className="kpi-value">{hallazgosBloqueantes}</div>
                <div className="kpi-sub">requieren atención inmediata</div>
              </div>
            )}
            {/* Firma */}
            {ins.firma_url && (
              <div className="card">
                <div className="card-header"><span className="card-title" style={{ fontSize: '0.8rem' }}>Firma</span></div>
                <div className="card-body" style={{ padding: 12, textAlign: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ins.firma_url} alt="Firma del inspector" style={{ maxHeight: 80, margin: '0 auto', borderRadius: 4 }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fotos generales */}
        {fotosGenerales.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header"><span className="card-title">Fotos del Vehículo</span></div>
            <div className="card-body">
              <div className="photos-grid">
                {fotosGenerales.map(foto => (
                  <div key={foto.label}>
                    <PhotoViewer src={foto.url!} alt={foto.label} />
                    <div className="photo-label">{foto.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Checklist por sección */}
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
                    <div key={item.id} className="checklist-item">
                      <div className="checklist-icon">
                        {item.is_good ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--status-ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--status-danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span className="checklist-label">{item.item_label}</span>
                          {item.is_blocking && !item.is_good && (
                            <span className="checklist-blocking">⚡ BLOQUEANTE</span>
                          )}
                        </div>
                        {item.descripcion && (
                          <div className="checklist-desc">{item.descripcion}</div>
                        )}
                      </div>
                      {item.foto_url && (
                        <PhotoViewer src={item.foto_url} alt={`Foto: ${item.item_label}`} />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fallback: sin detalles */}
        {details.length === 0 && (
          <div className="card">
            <div className="card-body empty-state">
              <p>Esta inspección no tiene detalles de checklist registrados.</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
