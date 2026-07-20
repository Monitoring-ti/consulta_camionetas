'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateWorkerDocuments } from '@/app/actions'
import type { TrabajadorDocVenc, DocVencPayload } from '@/types/app.types'
import { getDocStatus, formatDate } from '@/lib/utils/dates'
import {
  LICENSE_TYPES,
  parseLicenseTypes,
  serializeLicenseTypes,
  type LicenseType,
} from '@/lib/utils/license-types'

interface WorkerDocsFormProps {
  worker: TrabajadorDocVenc
}

export default function WorkerDocsForm({ worker }: WorkerDocsFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [vencLicencia, setVencLicencia] = useState(worker.vencimiento_licencia_conducir ?? '')
  const [vencPsico, setVencPsico] = useState(worker.vencimiento_psicosensometrico ?? '')
  const [numInterna, setNumInterna] = useState(worker.numero_licencia_interna ?? '')
  const [vencInterna, setVencInterna] = useState(worker.vencimiento_licencia_interna ?? '')
  const [tipos, setTipos] = useState<LicenseType[]>(() =>
    parseLicenseTypes(worker.licencia_conducir_tipo)
  )

  function toggleTipo(tipo: LicenseType) {
    setTipos(prev =>
      prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo]
    )
    setSuccess(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    const payload: DocVencPayload = {
      vencimiento_licencia_conducir: vencLicencia.trim() || null,
      licencia_conducir_tipo: serializeLicenseTypes(tipos),
      vencimiento_psicosensometrico: vencPsico.trim() || null,
      numero_licencia_interna: numInterna.trim() || null,
      vencimiento_licencia_interna: vencInterna.trim() || null,
    }

    startTransition(async () => {
      const res = await updateWorkerDocuments(worker.id_trabajador, payload)
      if (!res.ok) {
        setError(res.error || 'Error al guardar')
      } else {
        setSuccess(true)
        router.refresh()
      }
    })
  }

  const statusBadgeClass: Record<string, string> = {
    ok: 'badge-ok',
    warning: 'badge-warning',
    danger: 'badge-danger',
    nodata: 'badge-nodata',
  }

  const statusCards: { label: string; date: string | null; extra?: string }[] = [
    {
      label: 'Licencia conducir',
      date: worker.vencimiento_licencia_conducir,
      extra: parseLicenseTypes(worker.licencia_conducir_tipo).join(', ') || undefined,
    },
    {
      label: 'Examen psicosensométrico',
      date: worker.vencimiento_psicosensometrico,
    },
    {
      label: 'Licencia interna',
      date: worker.vencimiento_licencia_interna,
      extra: worker.numero_licencia_interna
        ? `N° ${worker.numero_licencia_interna}`
        : undefined,
    },
  ]

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="login-error" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            background: 'rgba(34,197,94,0.12)',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: 8,
            padding: '10px 16px',
            marginBottom: 20,
            color: 'var(--status-ok)',
            fontSize: '0.875rem',
          }}
        >
          Datos guardados correctamente
        </div>
      )}

      <div className="form-section">
        <div className="form-section-title">Estado actual</div>
        <div className="form-grid form-grid-2">
          {statusCards.map(card => {
            const stat = getDocStatus(card.date)
            return (
              <div
                key={card.label}
                style={{
                  padding: '10px 14px',
                  background: 'var(--surface-card)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginBottom: 4,
                  }}
                >
                  {card.label}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                      {formatDate(card.date)}
                    </div>
                    {card.extra && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {card.extra}
                      </div>
                    )}
                  </div>
                  <span className={`badge ${statusBadgeClass[stat.status]}`}>{stat.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Licencia de conducir</div>
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">Tipo de licencia (puede marcar más de una)</label>
          <div className="license-type-grid" role="group" aria-label="Tipos de licencia">
            {LICENSE_TYPES.map(tipo => {
              const active = tipos.includes(tipo)
              return (
                <button
                  key={tipo}
                  type="button"
                  className={`license-type-chip ${active ? 'is-active' : ''}`}
                  aria-pressed={active}
                  onClick={() => toggleTipo(tipo)}
                >
                  {tipo}
                </button>
              )
            })}
          </div>
          <p className="form-hint">
            Seleccionados:{' '}
            {tipos.length > 0 ? tipos.join(', ') : 'ninguno'}
          </p>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="venc-licencia">
            Vencimiento licencia conducir
          </label>
          <input
            id="venc-licencia"
            className="form-input"
            type="date"
            value={vencLicencia}
            onChange={e => {
              setVencLicencia(e.target.value)
              setSuccess(false)
            }}
          />
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Examen psicosensométrico</div>
        <div className="form-group">
          <label className="form-label" htmlFor="venc-psico">
            Vencimiento
          </label>
          <input
            id="venc-psico"
            className="form-input"
            type="date"
            value={vencPsico}
            onChange={e => {
              setVencPsico(e.target.value)
              setSuccess(false)
            }}
          />
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Licencia interna</div>
        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label className="form-label" htmlFor="num-interna">
              Número de licencia interna
            </label>
            <input
              id="num-interna"
              className="form-input"
              type="text"
              value={numInterna}
              onChange={e => {
                setNumInterna(e.target.value)
                setSuccess(false)
              }}
              placeholder="Ej. LI-1234"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="venc-interna">
              Vencimiento licencia interna
            </label>
            <input
              id="venc-interna"
              className="form-input"
              type="date"
              value={vencInterna}
              onChange={e => {
                setVencInterna(e.target.value)
                setSuccess(false)
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? (
            <>
              <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />{' '}
              Guardando…
            </>
          ) : (
            'Guardar'
          )}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
