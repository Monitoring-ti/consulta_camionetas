import { createClient } from '@/lib/supabase/server'
import { getDocStatus } from '@/lib/utils/dates'
import Link from 'next/link'
import type { Vehicle } from '@/types/app.types'

const DOC_FIELDS = [
  { key: 'fecha_revision_tecnica' as keyof Vehicle, label: 'Rev. Técnica' },
  { key: 'vencimiento_seguro' as keyof Vehicle, label: 'Seguro' },
  { key: 'vencimiento_permiso' as keyof Vehicle, label: 'Permiso' },
  { key: 'vencimiento_extintor' as keyof Vehicle, label: 'Extintor' },
  { key: 'vencimiento_torque_ruedas' as keyof Vehicle, label: 'Torque' },
  { key: 'vencimiento_gps' as keyof Vehicle, label: 'GPS' },
]

function worstDocStatus(v: Vehicle): 'ok' | 'warning' | 'danger' | 'nodata' {
  const statuses = DOC_FIELDS.map(f => getDocStatus(v[f.key] as string | null).status)
  if (statuses.includes('danger')) return 'danger'
  if (statuses.includes('warning')) return 'warning'
  if (statuses.includes('ok')) return 'ok'
  return 'nodata'
}

export default async function VehiclesPage() {
  const supabase = await createClient()

  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('patente')

  const vehicleList: Vehicle[] = (vehicles as Vehicle[]) ?? []

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, paddingTop: 24 }}>
        <div>
          <h1 className="page-title">Vehículos</h1>
          <p className="page-subtitle">{vehicleList.length} vehículos registrados</p>
        </div>
        <Link href="/vehicles/new" className="btn btn-primary" style={{ marginTop: 4 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nuevo vehículo
        </Link>
      </div>

      <div className="page-body">
        {error && (
          <div className="login-error" style={{ marginBottom: 16 }}>
            Error al cargar vehículos: {error.message}
          </div>
        )}

        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Patente</th>
                  <th>Vehículo</th>
                  <th>Año</th>
                  <th>Km Actual</th>
                  <th>Proveedor</th>
                  <th>Contrato</th>
                  <th>Estado Docs</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {vehicleList.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="empty-state">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v9a2 2 0 01-2 2h-2" />
                          <circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
                        </svg>
                        <p>No hay vehículos registrados</p>
                        <Link href="/vehicles/new" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                          Crear el primero
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  vehicleList.map(v => {
                    const worst = worstDocStatus(v)
                    const badgeClass: Record<string, string> = {
                      ok: 'badge-ok',
                      warning: 'badge-warning',
                      danger: 'badge-danger',
                      nodata: 'badge-nodata',
                    }
                    const badgeLabel: Record<string, string> = {
                      ok: '✓ Al día',
                      warning: '⚠ Por vencer',
                      danger: '✕ Vencido',
                      nodata: '— Sin datos',
                    }
                    return (
                      <tr key={v.id} onClick={() => window.location.href = `/vehicles/${v.id}`}>
                        <td className="primary" style={{ fontWeight: 700, letterSpacing: '0.05em' }}>
                          {v.patente}
                        </td>
                        <td className="primary">{v.marca} {v.modelo}</td>
                        <td>{v.anio}</td>
                        <td>{v.km_actual?.toLocaleString('es-CL') ?? '—'} km</td>
                        <td>{v.proveedor_arriendo ?? '—'}</td>
                        <td>{v.contrato_pertenece ?? '—'}</td>
                        <td>
                          <span className={`badge ${badgeClass[worst]}`}>
                            {badgeLabel[worst]}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${v.is_active ? 'badge-active' : 'badge-inactive'}`}>
                            {v.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <Link href={`/vehicles/${v.id}/edit`} className="btn btn-secondary btn-sm">
                            Editar
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
