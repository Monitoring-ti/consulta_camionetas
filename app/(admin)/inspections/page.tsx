import {
  fetchInspections,
  fetchVehicles,
  fetchVehicleInspectionHistory,
} from '@/app/actions'
import { chileDateISO, formatChileDayLong } from '@/lib/utils/chile-date'
import { formatPatenteDisplay } from '@/lib/utils/patente'
import Link from 'next/link'
import DailyInspectionsReport, {
  buildDailyRows,
} from '@/components/inspections/DailyInspectionsReport'
import VehicleInspectionHistoryView from '@/components/inspections/VehicleInspectionHistoryView'

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    vehicle?: string
    resultado?: string
    dia?: string
    desde?: string
    hasta?: string
  }>
}) {
  const params = await searchParams
  const selectedVehicle = params.vehicle?.trim() || ''
  const today = chileDateISO()
  const day = (params.dia || params.desde || today).slice(0, 10)

  const [vehicleList, listResult, history] = await Promise.all([
    fetchVehicles(),
    selectedVehicle
      ? Promise.resolve({ data: [], error: null as string | null })
      : fetchInspections({
          resultado: params.resultado,
          desde: day,
          hasta: day,
          limit: 500,
        }),
    selectedVehicle
      ? fetchVehicleInspectionHistory(selectedVehicle, {
          resultado: params.resultado,
          desde: params.desde,
          hasta: params.hasta,
        })
      : Promise.resolve(null),
  ])

  const inspections = selectedVehicle ? history?.inspections ?? [] : listResult.data
  const error = selectedVehicle ? history?.error ?? null : listResult.error
  const dailyRows = selectedVehicle ? [] : buildDailyRows(vehicleList, inspections)
  const inspectedToday = dailyRows.filter(r => r.inspection).length

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Inspecciones</h1>
        <p className="page-subtitle">
          {selectedVehicle
            ? `Historial de ${formatPatenteDisplay(selectedVehicle)} · ${inspections.length} registro${inspections.length !== 1 ? 's' : ''}`
            : `Resumen diario · ${formatChileDayLong(day)} · ${inspectedToday} inspeccionada${inspectedToday !== 1 ? 's' : ''}`}
        </p>
      </div>

      <div className="page-body">
        <form method="GET" className="filters-bar daily-filters no-print" style={{ marginBottom: 20 }}>
          {selectedVehicle ? (
            <>
              <input type="hidden" name="vehicle" value={selectedVehicle} />
              <select
                name="resultado"
                className="form-select"
                defaultValue={params.resultado ?? ''}
              >
                <option value="">Todos los resultados</option>
                <option value="Apto">Apto</option>
                <option value="No Apto">No Apto</option>
              </select>
              <input
                name="desde"
                type="date"
                className="form-input"
                defaultValue={params.desde ?? ''}
                style={{ width: 160 }}
                aria-label="Desde"
              />
              <input
                name="hasta"
                type="date"
                className="form-input"
                defaultValue={params.hasta ?? ''}
                style={{ width: 160 }}
                aria-label="Hasta"
              />
              <button type="submit" className="btn btn-primary btn-sm">
                Filtrar
              </button>
              <Link href="/inspections" className="btn btn-secondary btn-sm">
                Volver al día
              </Link>
            </>
          ) : (
            <>
              <label className="daily-filter-label" htmlFor="insp-dia">
                Día
              </label>
              <input
                id="insp-dia"
                name="dia"
                type="date"
                className="form-input"
                defaultValue={day}
                style={{ width: 160 }}
              />
              <select
                name="resultado"
                className="form-select"
                defaultValue={params.resultado ?? ''}
                aria-label="Estado"
              >
                <option value="">Todos los estados</option>
                <option value="Apto">Apto</option>
                <option value="No Apto">No Apto</option>
              </select>
              <select
                name="vehicle"
                className="form-select"
                defaultValue=""
                style={{ minWidth: 220 }}
                aria-label="Historial por patente"
              >
                <option value="">Historial por patente…</option>
                {vehicleList.map(v => (
                  <option key={v.id} value={v.patente}>
                    {formatPatenteDisplay(v.patente)} — {v.marca} {v.modelo}
                    {v.is_active === false ? ' (historial)' : ''}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn-primary btn-sm">
                Ver
              </button>
              {day !== today && (
                <Link href="/inspections" className="btn btn-secondary btn-sm">
                  Hoy
                </Link>
              )}
            </>
          )}
        </form>

        {error && (
          <div className="login-error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        {selectedVehicle && history ? (
          <VehicleInspectionHistoryView
            history={history}
            patente={selectedVehicle}
            filters={{
              vehicle: selectedVehicle,
              resultado: params.resultado,
              desde: params.desde,
              hasta: params.hasta,
            }}
          />
        ) : (
          <DailyInspectionsReport
            day={day}
            rows={dailyRows}
            resultadoFilter={params.resultado}
          />
        )}
      </div>
    </>
  )
}
