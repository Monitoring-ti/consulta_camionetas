import { notFound } from 'next/navigation'
import { fetchWorkers } from '@/app/actions'
import WorkerDocsForm from '@/components/workers/WorkerDocsForm'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function WorkerEditPage({ params }: Props) {
  const { id } = await params
  const workers = await fetchWorkers()
  const worker = workers.find(w => w.id_trabajador === decodeURIComponent(id))

  if (!worker) {
    notFound()
  }

  const nombreCompleto = `${worker.nombre_1}${worker.nombre_2 ? ' ' + worker.nombre_2 : ''} ${worker.apellido_paterno}${worker.apellido_materno ? ' ' + worker.apellido_materno : ''}`

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Editar Vencimientos</h1>
        <p className="page-subtitle">{nombreCompleto} · {worker.numero_identificacion}</p>
      </div>

      <div className="page-body">
        <div className="card" style={{ padding: '24px 28px', maxWidth: 860 }}>
          {/* Worker info strip */}
          <div style={{
            display: 'flex', gap: 24, padding: '14px 18px', marginBottom: 28,
            background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)',
            flexWrap: 'wrap'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Nombre</div>
              <div style={{ fontWeight: 600 }}>{nombreCompleto}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>RUT</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{worker.numero_identificacion}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Cargo</div>
              <div>{worker.cargo ?? '—'}</div>
            </div>
            {worker.area_departamento && (
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Área</div>
                <div>{worker.area_departamento}</div>
              </div>
            )}
          </div>

          <WorkerDocsForm worker={worker} />
        </div>
      </div>
    </>
  )
}
