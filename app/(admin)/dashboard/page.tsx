import { createClient } from '@/lib/supabase/server'
import { getDocStatus, daysUntil } from '@/lib/utils/dates'
import type { Vehicle } from '@/types/app.types'
import Link from 'next/link'

const DOC_FIELDS: { key: keyof Vehicle; label: string }[] = [
  { key: 'fecha_revision_tecnica', label: 'Revisión Técnica' },
  { key: 'vencimiento_seguro', label: 'Seguro' },
  { key: 'vencimiento_permiso', label: 'Permiso Circulación' },
  { key: 'vencimiento_extintor', label: 'Extintor' },
  { key: 'vencimiento_torque_ruedas', label: 'Torque Ruedas' },
  { key: 'vencimiento_gps', label: 'Certificado GPS' },
]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ok: 'badge-ok',
    warning: 'badge-warning',
    danger: 'badge-danger',
    nodata: 'badge-nodata',
  }
  const labelMap: Record<string, string> = {
    ok: '✓ Al día',
    warning: '⚠ Por vencer',
    danger: '✕ Vencido',
    nodata: '— Sin fecha',
  }
  return (
    <span className={`badge ${map[status]}`}>
      {labelMap[status]}
    </span>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Vehículos activos
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .eq('is_active', true)
    .order('patente')

  // Inspecciones último mes
  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
  const { data: recentInspections } = await supabase
    .from('monitoring_inspections')
    .select('id, resultado')
    .gte('fecha', oneMonthAgo.toISOString().split('T')[0])

  // Calcular KPIs
  const vehicleList = (vehicles as Vehicle[] | null) ?? []
  const vehiculosActivos = vehicleList.length
  const recentList = (recentInspections as { id: string; resultado: string }[] | null) ?? []
  const inspeccionesUltimoMes = recentList.length
  const aptos = recentList.filter(i => i.resultado?.toLowerCase().includes('apto') && !i.resultado?.toLowerCase().includes('no')).length
  const porcentajeAptos = inspeccionesUltimoMes > 0 ? Math.round((aptos / inspeccionesUltimoMes) * 100) : 0

  // Calcular alertas
  type AlertItem = {
    vehicleId: string
    patente: string
    marca: string
    modelo: string
    campo: string
    fechaVencimiento: string
    daysLeft: number
    status: string
  }

  const alertasVencidas: AlertItem[] = []
  const alertas7dias: AlertItem[] = []
  const alertas30dias: AlertItem[] = []
  const alertas60dias: AlertItem[] = []

  for (const v of vehicleList) {
    for (const field of DOC_FIELDS) {
      const val = v[field.key] as string | null
      if (!val) continue
      const days = daysUntil(val) ?? 0
      const item: AlertItem = {
        vehicleId: v.id,
        patente: v.patente,
        marca: v.marca,
        modelo: v.modelo,
        campo: field.label,
        fechaVencimiento: val,
        daysLeft: days,
        status: getDocStatus(val).status,
      }
      if (days < 0) alertasVencidas.push(item)
      else if (days <= 7) alertas7dias.push(item)
      else if (days <= 30) alertas30dias.push(item)
      else if (days <= 60) alertas60dias.push(item)
    }
  }

  const vehiculosConDocVencido = new Set(alertasVencidas.map(a => a.vehicleId)).size

  function formatFecha(dateStr: string) {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Resumen operacional — vehículos e inspecciones</p>
      </div>

      <div className="page-body">
        {/* KPIs */}
        <div className="kpi-grid">
          <div className="kpi-card primary">
            <div className="kpi-label">Vehículos Activos</div>
            <div className="kpi-value">{vehiculosActivos}</div>
            <div className="kpi-sub">en flota</div>
          </div>
          <div className="kpi-card success">
            <div className="kpi-label">Inspecciones (30d)</div>
            <div className="kpi-value">{inspeccionesUltimoMes}</div>
            <div className="kpi-sub">último mes</div>
          </div>
          <div className="kpi-card success">
            <div className="kpi-label">% Aptos</div>
            <div className="kpi-value">{porcentajeAptos}%</div>
            <div className="kpi-sub">último mes</div>
          </div>
          <div className="kpi-card danger">
            <div className="kpi-label">Docs Vencidos</div>
            <div className="kpi-value">{vehiculosConDocVencido}</div>
            <div className="kpi-sub">vehículos afectados</div>
          </div>
        </div>

        {/* Alertas vencidas */}
        {alertasVencidas.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: 'var(--status-danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              Vencidos ({alertasVencidas.length})
            </h2>
            <div className="alert-grid">
              {groupByVehicle(alertasVencidas).map(group => (
                <Link key={group.vehicleId} href={`/vehicles/${group.vehicleId}`} style={{ textDecoration: 'none' }}>
                  <div className="alert-card danger">
                    <div className="alert-card-patente">{group.patente}</div>
                    <div className="alert-card-vehicle">{group.marca} {group.modelo}</div>
                    <div className="alert-card-items">
                      {group.items.map(item => (
                        <div key={item.campo} className="alert-card-item">
                          <span className="alert-card-item-name">{item.campo}</span>
                          <span className="badge badge-danger" style={{ fontSize: '0.7rem', padding: '2px 7px' }}>
                            {Math.abs(item.daysLeft)}d vencido
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Alertas 7 días */}
        {alertas7dias.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: 'var(--status-danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
              🔥 Próximos 7 días ({alertas7dias.length})
            </h2>
            <div className="alert-grid">
              {groupByVehicle(alertas7dias).map(group => (
                <Link key={group.vehicleId} href={`/vehicles/${group.vehicleId}`} style={{ textDecoration: 'none' }}>
                  <div className="alert-card danger">
                    <div className="alert-card-patente">{group.patente}</div>
                    <div className="alert-card-vehicle">{group.marca} {group.modelo}</div>
                    <div className="alert-card-items">
                      {group.items.map(item => (
                        <div key={item.campo} className="alert-card-item">
                          <span className="alert-card-item-name">{item.campo}</span>
                          <span className="badge badge-danger" style={{ fontSize: '0.7rem', padding: '2px 7px' }}>
                            {item.daysLeft}d
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Alertas 30 días */}
        {alertas30dias.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: 'var(--status-warning)', display: 'flex', alignItems: 'center', gap: 8 }}>
              ⚠️ Próximos 30 días ({alertas30dias.length})
            </h2>
            <div className="alert-grid">
              {groupByVehicle(alertas30dias).map(group => (
                <Link key={group.vehicleId} href={`/vehicles/${group.vehicleId}`} style={{ textDecoration: 'none' }}>
                  <div className="alert-card warning">
                    <div className="alert-card-patente">{group.patente}</div>
                    <div className="alert-card-vehicle">{group.marca} {group.modelo}</div>
                    <div className="alert-card-items">
                      {group.items.map(item => (
                        <div key={item.campo} className="alert-card-item">
                          <span className="alert-card-item-name">{item.campo}</span>
                          <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '2px 7px' }}>
                            {item.daysLeft}d
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Alertas 60 días */}
        {alertas60dias.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: 'var(--status-warning)', display: 'flex', alignItems: 'center', gap: 8 }}>
              📅 Próximos 31–60 días ({alertas60dias.length})
            </h2>
            <div className="alert-grid">
              {groupByVehicle(alertas60dias).map(group => (
                <Link key={group.vehicleId} href={`/vehicles/${group.vehicleId}`} style={{ textDecoration: 'none' }}>
                  <div className="alert-card warning" style={{ borderLeftColor: 'var(--brand-primary)', background: 'linear-gradient(135deg, rgba(14,165,233,0.04), var(--bg-surface))' }}>
                    <div className="alert-card-patente">{group.patente}</div>
                    <div className="alert-card-vehicle">{group.marca} {group.modelo}</div>
                    <div className="alert-card-items">
                      {group.items.map(item => (
                        <div key={item.campo} className="alert-card-item">
                          <span className="alert-card-item-name">{item.campo}</span>
                          <span className="badge badge-active" style={{ fontSize: '0.7rem', padding: '2px 7px' }}>
                            {item.daysLeft}d
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {alertasVencidas.length === 0 && alertas7dias.length === 0 && alertas30dias.length === 0 && alertas60dias.length === 0 && (
          <div className="card" style={{ marginTop: 8 }}>
            <div className="card-body empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <p style={{ color: 'var(--status-ok)', fontWeight: 600 }}>¡Todo al día!</p>
              <p style={{ marginTop: 4 }}>No hay documentos vencidos ni por vencer en los próximos 60 días.</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

type AlertItem = {
  vehicleId: string
  patente: string
  marca: string
  modelo: string
  campo: string
  fechaVencimiento: string
  daysLeft: number
  status: string
}

function groupByVehicle(items: AlertItem[]) {
  const map = new Map<string, { vehicleId: string; patente: string; marca: string; modelo: string; items: AlertItem[] }>()
  for (const item of items) {
    if (!map.has(item.vehicleId)) {
      map.set(item.vehicleId, {
        vehicleId: item.vehicleId,
        patente: item.patente,
        marca: item.marca,
        modelo: item.modelo,
        items: [],
      })
    }
    map.get(item.vehicleId)!.items.push(item)
  }
  return Array.from(map.values())
}
