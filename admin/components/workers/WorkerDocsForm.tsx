'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { updateWorkerDocuments } from '@/app/actions'
import type { TrabajadorDocVenc, DocVencPayload } from '@/types/app.types'
import { getDocStatus, formatDate } from '@/lib/utils/dates'

interface WorkerDocsFormProps {
  worker: TrabajadorDocVenc
}

const DOC_LABELS: { key: keyof DocVencPayload; label: string; isText?: boolean }[] = [
  { key: 'vencimiento_licencia_conducir', label: 'Vencimiento Licencia Conducir' },
  { key: 'vencimiento_examen_ocupacional', label: 'Vencimiento Examen Ocupacional' },
  { key: 'vencimiento_altura_geo', label: 'Vencimiento Altura / Geo' },
  { key: 'vencimiento_psicosensometrico', label: 'Vencimiento Psicosensométrico' },
  { key: 'licencia_conducir_tipo', label: 'Tipo Licencia', isText: true },
  { key: 'licencia_conducir_numero', label: 'N° Licencia', isText: true },
]

export default function WorkerDocsForm({ worker }: WorkerDocsFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState<DocVencPayload>({
    vencimiento_licencia_conducir: worker.vencimiento_licencia_conducir ?? '',
    vencimiento_examen_ocupacional: worker.vencimiento_examen_ocupacional ?? '',
    vencimiento_altura_geo: worker.vencimiento_altura_geo ?? '',
    vencimiento_psicosensometrico: worker.vencimiento_psicosensometrico ?? '',
    licencia_conducir_tipo: worker.licencia_conducir_tipo ?? '',
    licencia_conducir_numero: worker.licencia_conducir_numero ?? '',
  })

  function set(field: keyof DocVencPayload, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setSuccess(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // Convert empty strings to null for date fields
    const payload: Partial<DocVencPayload> = {}
    for (const { key, isText } of DOC_LABELS) {
      const val = form[key] as string
      payload[key] = val.trim() === '' ? null : val.trim()
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
    ok: 'badge-ok', warning: 'badge-warning', danger: 'badge-danger', nodata: 'badge-nodata'
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="login-error" style={{ marginBottom: 20 }}>{error}</div>
      )}
      {success && (
        <div style={{
          background: 'rgba(34,197,94,0.12)',
          border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 8,
          padding: '10px 16px',
          marginBottom: 20,
          color: 'var(--status-ok)',
          fontSize: '0.875rem'
        }}>
          ✓ Datos guardados correctamente
        </div>
      )}

      {/* Estado actual de documentos */}
      <div className="form-section">
        <div className="form-section-title">Estado Actual de Documentos</div>
        <div className="form-grid form-grid-2">
          {(['vencimiento_licencia_conducir', 'vencimiento_examen_ocupacional', 'vencimiento_altura_geo', 'vencimiento_psicosensometrico'] as const).map(key => {
            const val = worker[key]
            const stat = getDocStatus(val)
            const labels: Record<string, string> = {
              vencimiento_licencia_conducir: 'Licencia Conducir',
              vencimiento_examen_ocupacional: 'Examen Ocupacional',
              vencimiento_altura_geo: 'Altura / Geo',
              vencimiento_psicosensometrico: 'Psicosensométrico',
            }
            return (
              <div key={key} style={{ padding: '10px 14px', background: 'var(--surface-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>{labels[key]}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{formatDate(val)}</span>
                  <span className={`badge ${statusBadgeClass[stat.status]}`}>{stat.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Editar fechas */}
      <div className="form-section">
        <div className="form-section-title">Actualizar Vencimientos</div>
        <div className="form-grid form-grid-2">
          {DOC_LABELS.map(({ key, label, isText }) => (
            <div className="form-group" key={key}>
              <label className="form-label">{label}</label>
              <input
                className="form-input"
                type={isText ? 'text' : 'date'}
                value={form[key] ?? ''}
                onChange={e => set(key, e.target.value)}
                placeholder={isText ? '—' : undefined}
              />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? (
            <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Guardando…</>
          ) : 'Guardar Vencimientos'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
