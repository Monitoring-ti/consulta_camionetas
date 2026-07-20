'use client'

import { useState, useTransition } from 'react'
import { getDocStatus } from '@/lib/utils/dates'
import { reactivateVehicleAction, permanentlyDeleteVehicleAction } from '@/app/actions'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

type VehiclesTableProps = {
  vehicles: Vehicle[]
  mode?: 'active' | 'history'
  emptyMessage?: string
  showCreateCta?: boolean
}

export default function VehiclesTable({
  vehicles,
  mode = 'active',
  emptyMessage,
  showCreateCta = false,
}: VehiclesTableProps) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const isHistory = mode === 'history'

  async function handleReactivate(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('¿Reactivar este vehículo y devolverlo a la flota activa?')) return
    setError('')
    setPendingId(id)
    startTransition(async () => {
      const res = await reactivateVehicleAction(id)
      setPendingId(null)
      if (!res.ok) {
        setError(res.error || 'No se pudo reactivar el vehículo')
        return
      }
      router.refresh()
    })
  }

  async function handlePermanentDelete(v: Vehicle, e: React.MouseEvent) {
    e.stopPropagation()
    const ok1 = confirm(
      `¿Eliminar definitivamente ${v.patente}?\n\nSolo vehículos desactivados pueden eliminarse. Se registrará quién y cuándo lo eliminó. Las inspecciones históricas por patente se conservan.`
    )
    if (!ok1) return
    const typed = window.prompt(
      `Para confirmar, escriba la patente exactamente:\n${v.patente}`
    )
    if (typed === null) return
    if (typed.trim().toUpperCase() !== v.patente.trim().toUpperCase()) {
      setError('La patente no coincide. Eliminación cancelada.')
      return
    }
    setError('')
    setPendingId(v.id)
    startTransition(async () => {
      const res = await permanentlyDeleteVehicleAction(v.id)
      setPendingId(null)
      if (!res.ok) {
        setError(res.error || 'No se pudo eliminar el vehículo')
        return
      }
      router.refresh()
    })
  }

  if (vehicles.length === 0) {
    return (
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
              <tr>
                <td colSpan={9}>
                  <div className="empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v9a2 2 0 01-2 2h-2" />
                      <circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
                    </svg>
                    <p>{emptyMessage ?? (isHistory ? 'No hay vehículos en el historial' : 'No hay vehículos activos')}</p>
                    {showCreateCta && (
                      <Link href="/vehicles/new" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                        Crear el primero
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      {error && (
        <div className="login-error" style={{ margin: 16, marginBottom: 0 }}>
          {error}
        </div>
      )}
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
            {vehicles.map(v => {
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
              const busy = isPending && pendingId === v.id
              return (
                <tr key={v.id} onClick={() => router.push(`/vehicles/${v.id}`)}>
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
                      {v.is_active ? 'Activo' : 'Historial'}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Link href={`/vehicles/${v.id}`} className="btn btn-secondary btn-sm">
                        Ver
                      </Link>
                      {isHistory ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={busy}
                            onClick={e => handleReactivate(v.id, e)}
                          >
                            {busy ? '…' : 'Reactivar'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={busy}
                            onClick={e => handlePermanentDelete(v, e)}
                          >
                            Eliminar
                          </button>
                        </>
                      ) : (
                        <Link href={`/vehicles/${v.id}/edit`} className="btn btn-secondary btn-sm">
                          Editar
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
