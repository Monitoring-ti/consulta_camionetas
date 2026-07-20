import { fetchVehicles } from '@/app/actions'
import VehiclesFleetClient from '@/components/vehicles/VehiclesFleetClient'
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
    <VehiclesFleetClient
      activeList={activeList}
      historyList={historyList}
      errorMessage={errorMessage}
    />
  )
}
