import { createClient } from '@/lib/supabase/server'
import { getDocStatus, formatDate } from '@/lib/utils/dates'
import type { Inspector } from '@/types/app.types'
import Link from 'next/link'

export default async function InspectorsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inspectors')
    .select('*')
    .order('nombre')

  const inspectors: Inspector[] = (data as Inspector[]) ?? []

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Trabajadores</h1>
          <p className="page-subtitle">{inspectors.length} trabajadores registrados</p>
        </div>
        <Link href="/inspectors/new" className="btn btn-primary">
          + Nuevo Trabajador
        </Link>
      </div>

      <div className="page-body">
        {error && (
          <div className="login-error" style={{ marginBottom: 16 }}>{error.message}</div>
        )}

        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Cargo</th>
                  <th>RUT</th>
                  <th>Teléfono</th>
                  <th>Lic. Municipal</th>
                  <th>Lic. Interna</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {inspectors.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="empty-state">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        <p>No hay trabajadores registrados</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  inspectors.map(insp => {
                    const licMun = getDocStatus(insp.vencimiento_licencia_municipal)
                    const licInt = getDocStatus(insp.vencimiento_licencia_interna)
                    const licMunClass: Record<string, string> = {
                      ok: 'badge-ok', warning: 'badge-warning', danger: 'badge-danger', nodata: 'badge-nodata'
                    }
                    return (
                      <tr key={insp.id}>
                        <td className="primary">{insp.nombre}</td>
                        <td>{insp.cargo}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{insp.rut ?? '—'}</td>
                        <td>{insp.telefono ?? '—'}</td>
                        <td>
                          <span className={`badge ${licMunClass[licMun.status]}`} title={insp.vencimiento_licencia_municipal ?? ''}>
                            {licMun.label}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${licMunClass[licInt.status]}`} title={insp.vencimiento_licencia_interna ?? ''}>
                            {licInt.label}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${insp.tipo_usuario === 'Admin' ? 'badge-active' : 'badge-nodata'}`}>
                            {insp.tipo_usuario ?? 'Normal'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${insp.is_active ? 'badge-active' : 'badge-inactive'}`}>
                            {insp.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Link href={`/inspectors/${insp.id}/edit`} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>
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
