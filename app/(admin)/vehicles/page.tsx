import { fetchVehicles } from '@/app/actions'
import VehiclesTable from '@/components/vehicles/VehiclesTable'
import Link from 'next/link'
import type { Vehicle } from '@/types/app.types'

export const dynamic = 'force-dynamic'

export default async function VehiclesPage() {
  let activeList: Vehicle[] = []
  let historyList: Vehicle[] = []
  let errorMessage: string | null = null

  try {
    const all = await fetchVehicles()
    activeList = all.filter(v => v.is_active !== false)
    historyList = all
      .filter(v => v.is_active === false)
      .sort((a, b) => a.patente.localeCompare(b.patente, 'es'))
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Error al cargar vehículos'
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, paddingTop: 24 }}>
        <div>
          <h1 className="page-title">Vehículos</h1>
          <p className="page-subtitle">
            {activeList.length} activos
            {historyList.length > 0 ? ` · ${historyList.length} en historial` : ''}
          </p>
        </div>
        <Link href="/vehicles/new" className="btn btn-action" style={{ marginTop: 4 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nuevo vehículo
        </Link>
      </div>

      <div className="page-body">
        {errorMessage && (
          <div className="login-error" style={{ marginBottom: 16 }}>
            Error al cargar vehículos: {errorMessage}
          </div>
        )}

        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Flota activa
            </h2>
          </div>
          <VehiclesTable
            vehicles={activeList}
            mode="active"
            showCreateCta
            emptyMessage="No hay vehículos activos en la flota"
          />
        </div>

        <div id="historial">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Historial (desactivados)
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Conservan datos, documentos e inspecciones. No aparecen en la grilla activa ni en terreno hasta reactivarlos.
            </p>
          </div>
          <VehiclesTable
            vehicles={historyList}
            mode="history"
            emptyMessage="Aún no hay vehículos desactivados"
          />
        </div>
      </div>
    </>
  )
}
