'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { getDocStatus, worstStatus, formatDate } from '@/lib/utils/dates'
import type { TrabajadorDocVenc } from '@/types/app.types'
import type { DocStatus } from '@/types/app.types'

interface WorkersTableProps {
  workers: TrabajadorDocVenc[]
}

type GroupMode = 'area' | 'status' | 'none'

const statusOrder: Record<DocStatus, number> = { danger: 0, warning: 1, nodata: 2, ok: 3 }
const statusBadge: Record<DocStatus, string> = {
  danger: 'badge-danger', warning: 'badge-warning', ok: 'badge-ok', nodata: 'badge-nodata'
}
const statusLabel: Record<DocStatus, string> = {
  danger: '🔴 Vencido / Crítico', warning: '🟡 Por vencer', ok: '🟢 Vigente', nodata: '⚪ Sin datos'
}

function workerOverallStatus(w: TrabajadorDocVenc): DocStatus {
  return worstStatus([
    getDocStatus(w.vencimiento_licencia_conducir).status,
    getDocStatus(w.vencimiento_psicosensometrico).status,
    getDocStatus(w.vencimiento_licencia_interna).status,
  ])
}

function DocBadge({ date }: { date: string | null }) {
  const st = getDocStatus(date)
  return (
    <span className={`badge ${statusBadge[st.status]}`} title={date ?? ''}>
      {date ? formatDate(date) : '—'}
    </span>
  )
}

export default function WorkersTable({ workers }: WorkersTableProps) {
  const [search, setSearch] = useState('')
  const [groupMode, setGroupMode] = useState<GroupMode>('area')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['all']))

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return workers
    return workers.filter(w =>
      w.nombre_1.toLowerCase().includes(q) ||
      w.apellido_paterno.toLowerCase().includes(q) ||
      (w.apellido_materno?.toLowerCase().includes(q) ?? false) ||
      w.numero_identificacion.toLowerCase().includes(q) ||
      (w.cargo?.toLowerCase().includes(q) ?? false) ||
      (w.area_departamento?.toLowerCase().includes(q) ?? false)
    )
  }, [workers, search])

  // Build groups
  const groups = useMemo(() => {
    if (groupMode === 'none') {
      return [{ key: 'all', label: `Todos (${filtered.length})`, workers: filtered }]
    }
    if (groupMode === 'status') {
      const map: Record<DocStatus, TrabajadorDocVenc[]> = { danger: [], warning: [], nodata: [], ok: [] }
      for (const w of filtered) map[workerOverallStatus(w)].push(w)
      return (['danger', 'warning', 'nodata', 'ok'] as DocStatus[])
        .filter(k => map[k].length > 0)
        .map(k => ({ key: k, label: `${statusLabel[k]} (${map[k].length})`, workers: map[k] }))
    }
    // area
    const map: Record<string, TrabajadorDocVenc[]> = {}
    for (const w of filtered) {
      const area = w.area_departamento || 'Sin área'
      if (!map[area]) map[area] = []
      map[area].push(w)
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([area, ws]) => ({ key: area, label: `${area} (${ws.length})`, workers: ws }))
  }, [filtered, groupMode])

  function toggleGroup(key: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function expandAll() {
    setExpandedGroups(new Set(groups.map(g => g.key)))
  }

  function collapseAll() {
    setExpandedGroups(new Set())
  }

  return (
    <div>
      {/* Controls */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              id="workers-search"
              className="form-input"
              style={{ paddingLeft: 38, margin: 0 }}
              type="text"
              placeholder="Buscar por nombre, RUT, cargo o área…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Group selector */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Agrupar:</span>
            {(['area', 'status', 'none'] as GroupMode[]).map(m => (
              <button
                key={m}
                id={`group-${m}`}
                onClick={() => setGroupMode(m)}
                className={`btn ${groupMode === m ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '5px 12px', fontSize: '0.8rem' }}
              >
                {m === 'area' ? 'Área' : m === 'status' ? 'Estado' : 'Sin grupo'}
              </button>
            ))}
          </div>

          {groupMode !== 'none' && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.78rem' }} onClick={expandAll}>Expandir todo</button>
              <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.78rem' }} onClick={collapseAll}>Colapsar todo</button>
            </div>
          )}
        </div>

        {/* Summary badges */}
        {search === '' && (
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            {(['danger', 'warning', 'ok', 'nodata'] as DocStatus[]).map(st => {
              const count = workers.filter(w => workerOverallStatus(w) === st).length
              if (!count) return null
              return (
                <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'var(--surface-card)', border: '1px solid var(--border)', fontSize: '0.8rem' }}>
                  <span className={`badge ${statusBadge[st]}`} style={{ padding: '2px 6px' }}>{statusLabel[st].split(' ')[0]}</span>
                  <span>{count} trabajador{count !== 1 ? 'es' : ''}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Sin resultados para &ldquo;{search}&rdquo;
        </div>
      )}

      {/* Groups */}
      {groups.map(group => {
        const isExpanded = expandedGroups.has(group.key) || groupMode === 'none'
        const groupStatus = group.key as DocStatus
        return (
          <div key={group.key} className="card" style={{ marginBottom: 16, overflow: 'hidden', padding: 0 }}>
            {/* Group header */}
            <button
              onClick={() => groupMode !== 'none' && toggleGroup(group.key)}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 20px', background: 'var(--surface-card)', border: 'none', cursor: groupMode !== 'none' ? 'pointer' : 'default',
                borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                color: 'var(--text-primary)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: '0.9rem' }}>
                {groupMode === 'status' && <span className={`badge ${statusBadge[groupStatus]}`} style={{ fontSize: '0.75rem' }}>{statusLabel[groupStatus].split(' ')[0]}</span>}
                {group.label}
              </div>
              {groupMode !== 'none' && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', transition: 'transform 0.2s', display: 'inline-block', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
              )}
            </button>

            {/* Table */}
            {isExpanded && (
              <div className="table-wrapper" style={{ padding: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Trabajador</th>
                      <th>RUT</th>
                      <th>Cargo / Área</th>
                      <th>Tipos lic.</th>
                      <th>Lic. Conducir</th>
                      <th>Psicosens.</th>
                      <th>Lic. Interna</th>
                      <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.workers.map(w => {
                      const overall = workerOverallStatus(w)
                      const tipos = (w.licencia_conducir_tipo || '')
                        .split(/[,;]/)
                        .map(t => t.trim())
                        .filter(Boolean)
                        .join(', ')
                      return (
                        <tr key={w.id_trabajador}>
                          <td className="primary">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span
                                className={`badge ${statusBadge[overall]}`}
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  padding: 0,
                                  flexShrink: 0,
                                }}
                              />
                              {w.nombre_1} {w.apellido_paterno}
                            </div>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {w.numero_identificacion}
                          </td>
                          <td>
                            <div style={{ fontSize: '0.85rem' }}>{w.cargo ?? '—'}</div>
                            {w.area_departamento && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {w.area_departamento}
                              </div>
                            )}
                          </td>
                          <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            {tipos || '—'}
                          </td>
                          <td>
                            <DocBadge date={w.vencimiento_licencia_conducir} />
                          </td>
                          <td>
                            <DocBadge date={w.vencimiento_psicosensometrico} />
                          </td>
                          <td>
                            <div>
                              <DocBadge date={w.vencimiento_licencia_interna} />
                            </div>
                            {w.numero_licencia_interna && (
                              <div
                                style={{
                                  fontSize: '0.72rem',
                                  color: 'var(--text-muted)',
                                  marginTop: 4,
                                  fontFamily: 'ui-monospace, monospace',
                                }}
                              >
                                N° {w.numero_licencia_interna}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Link
                              href={`/workers/${encodeURIComponent(w.id_trabajador)}/edit`}
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                            >
                              Editar
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
