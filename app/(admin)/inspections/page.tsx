import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils/dates'
import Link from 'next/link'
import type { Inspection } from '@/types/app.types'

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ patente?: string; resultado?: string; desde?: string; hasta?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('monitoring_inspections')
    .select('*')
    .order('fecha', { ascending: false })
    .order('hora', { ascending: false })
    .limit(200)

  if (params.patente) query = query.ilike('patente', `%${params.patente}%`)
  if (params.resultado) query = query.ilike('resultado', `%${params.resultado}%`)
  if (params.desde) query = query.gte('fecha', params.desde)
  if (params.hasta) query = query.lte('fecha', params.hasta)

  const { data, error } = await query
  const inspections: Inspection[] = (data as Inspection[]) ?? []

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Inspecciones</h1>
        <p className="page-subtitle">{inspections.length} registros encontrados</p>
      </div>

      <div className="page-body">
        {/* Filtros */}
        <form method="GET" className="filters-bar" style={{ marginBottom: 20 }}>
          <div className="search-input-wrapper">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              name="patente"
              className="form-input"
              placeholder="Buscar patente…"
              defaultValue={params.patente ?? ''}
              style={{ minWidth: 160 }}
            />
          </div>
          <select name="resultado" className="form-select" defaultValue={params.resultado ?? ''}>
            <option value="">Todos los resultados</option>
            <option value="Apto">Apto</option>
            <option value="No Apto">No Apto</option>
          </select>
          <input name="desde" type="date" className="form-input" defaultValue={params.desde ?? ''} style={{ width: 160 }} />
          <input name="hasta" type="date" className="form-input" defaultValue={params.hasta ?? ''} style={{ width: 160 }} />
          <button type="submit" className="btn btn-primary btn-sm">Filtrar</button>
          <Link href="/inspections" className="btn btn-secondary btn-sm">Limpiar</Link>
        </form>

        {error && (
          <div className="login-error" style={{ marginBottom: 16 }}>{error.message}</div>
        )}

        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Patente</th>
                  <th>Vehículo</th>
                  <th>Responsable</th>
                  <th>Km</th>
                  <th>Resultado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {inspections.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                        </svg>
                        <p>No se encontraron inspecciones</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  inspections.map(ins => {
                    const isApto = ins.resultado?.toLowerCase().includes('apto') && !ins.resultado?.toLowerCase().includes('no')
                    return (
                      <tr key={ins.id} onClick={() => window.location.href = `/inspections/${ins.id}`}>
                        <td className="primary">{formatDate(ins.fecha)}</td>
                        <td>{ins.hora?.slice(0, 5)}</td>
                        <td className="primary" style={{ fontWeight: 700, letterSpacing: '0.05em' }}>{ins.patente}</td>
                        <td>{ins.marca_modelo}</td>
                        <td>{ins.responsable_inspeccion}</td>
                        <td>{ins.kilometraje?.toLocaleString('es-CL')}</td>
                        <td>
                          <span className={`badge ${isApto ? 'badge-apto' : 'badge-no-apto'}`}>
                            {ins.resultado}
                          </span>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <Link href={`/inspections/${ins.id}`} className="btn btn-secondary btn-sm">
                            Ver
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
