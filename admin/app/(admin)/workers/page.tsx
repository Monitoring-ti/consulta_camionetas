import { fetchWorkers } from '@/app/actions'
import WorkersTable from '@/components/workers/WorkersTable'

export const dynamic = 'force-dynamic'

export default async function WorkersPage() {
  const workers = await fetchWorkers()

  // Summary counts
  const total = workers.length

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Trabajadores</h1>
          <p className="page-subtitle">{total} trabajadores registrados — Gestión de vencimientos de documentos</p>
        </div>
      </div>

      <div className="page-body">
        <WorkersTable workers={workers} />
      </div>
    </>
  )
}
