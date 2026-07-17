import { fetchVehicles } from '@/app/actions'
import VehiclesTable from '@/components/vehicles/VehiclesTable'
import Link from 'next/link'
import type { Vehicle } from '@/types/app.types'

export const dynamic = 'force-dynamic'

export default async function VehiclesPage() {
  let vehicleList: Vehicle[] = []
  let errorMessage: string | null = null

  try {
    vehicleList = await fetchVehicles()
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Error al cargar vehículos'
  }

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
        {errorMessage && (
          <div className="login-error" style={{ marginBottom: 16 }}>
            Error al cargar vehículos: {errorMessage}
          </div>
        )}

        <VehiclesTable vehicles={vehicleList} />
      </div>
    </>
  )
}
