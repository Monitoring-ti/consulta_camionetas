import { fetchVehicleById, fetchInspectionsByPatente } from '@/app/actions'
import { notFound } from 'next/navigation'
import { getDocStatus, formatDate } from '@/lib/utils/dates'
import { formatRut } from '@/lib/utils/formatters'
import Link from 'next/link'
import type { Vehicle } from '@/types/app.types'
import VehicleQR from '@/components/vehicles/VehicleQR'

const DOC_FIELDS: { key: keyof Vehicle; label: string; linkKey?: keyof Vehicle }[] = [
  { key: 'fecha_revision_tecnica', label: 'Revisión Técnica' },
  { key: 'vencimiento_seguro', label: 'Seguro' },
  { key: 'vencimiento_permiso', label: 'Permiso Circulación' },
  { key: 'vencimiento_extintor', label: 'Extintor' },
  { key: 'vencimiento_torque_ruedas', label: 'Torque Ruedas', linkKey: 'certificado_torque_ruedas' },
  { key: 'vencimiento_gps', label: 'Certificado GPS', linkKey: 'certificado_gps' },
]

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const vehicle = await fetchVehicleById(id)

  if (!vehicle) return notFound()

  const inspeccionesList = await fetchInspectionsByPatente(vehicle.patente, 20)

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb">
          <Link href="/vehicles">Vehículos</Link>
          <span className="breadcrumb-sep">/</span>
          <span>{vehicle.patente}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">{vehicle.patente}</h1>
            <p className="page-subtitle">{vehicle.marca} {vehicle.modelo} · {vehicle.anio}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <span className={`badge ${vehicle.is_active ? 'badge-active' : 'badge-inactive'}`} style={{ padding: '6px 14px' }}>
              {vehicle.is_active ? 'Activo' : 'Inactivo'}
            </span>
            <Link href={`/vehicles/${id}/edit`} className="btn btn-secondary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Editar
            </Link>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* Info básica */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title">Información General</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {[
                    { label: 'Patente', value: vehicle.patente },
                    { label: 'Marca / Modelo', value: `${vehicle.marca} ${vehicle.modelo}` },
                    { label: 'Año', value: String(vehicle.anio) },
                    { label: 'Km Actual', value: vehicle.km_actual?.toLocaleString('es-CL') + ' km' },
                    { label: 'Proveedor', value: vehicle.proveedor_arriendo },
                    { label: 'Contrato', value: vehicle.contrato_pertenece ?? '—' },
                    { label: 'Última inspección', value: vehicle.last_inspection_at ? formatDate(vehicle.last_inspection_at.split('T')[0]) : '—' },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>{item.value ?? '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <VehicleQR patente={vehicle.patente} marca={vehicle.marca} modelo={vehicle.modelo} />
          </div>

          {/* Estado de documentos */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Estado de Documentos</span>
            </div>
            <div className="card-body">
              <div className="doc-status-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {DOC_FIELDS.map(field => {
                  const info = getDocStatus(vehicle[field.key] as string | null)
                  const link = field.linkKey ? (vehicle[field.linkKey] as string | null) : null
                  return (
                    <div key={field.key} className={`doc-status-card ${info.status}`}>
                      <div className="doc-status-name">{field.label}</div>
                      <div className="doc-status-label">{info.label}</div>
                      {vehicle[field.key] && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {formatDate(vehicle[field.key] as string)}
                        </div>
                      )}
                      {link && (
                        <a href={link} target="_blank" rel="noopener noreferrer" className="doc-status-link">
                          Ver documento ↗
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Historial de inspecciones */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Historial de Inspecciones</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{inspeccionesList.length} registros</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Realizada por</th>
                  <th>Km</th>
                  <th>Resultado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {inspeccionesList.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state" style={{ padding: 24 }}>
                        <p>Sin inspecciones registradas para este vehículo</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  inspeccionesList.map(ins => {
                    const isApto = ins.resultado?.toLowerCase().includes('apto') && !ins.resultado?.toLowerCase().includes('no')
                    return (
                      <tr key={ins.id}>
                        <td className="primary">{formatDate(ins.fecha)}</td>
                        <td>{ins.hora?.slice(0, 5)}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{ins.responsable_inspeccion || '—'}</div>
                          {ins.responsable_rut && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace' }}>
                              {formatRut(ins.responsable_rut)}
                            </div>
                          )}
                        </td>
                        <td>{ins.kilometraje?.toLocaleString('es-CL')}</td>
                        <td>
                          <span className={`badge ${isApto ? 'badge-apto' : 'badge-no-apto'}`}>
                            {ins.resultado}
                          </span>
                        </td>
                        <td>
                          <Link href={`/inspections/${ins.id}`} className="btn btn-secondary btn-sm">
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
