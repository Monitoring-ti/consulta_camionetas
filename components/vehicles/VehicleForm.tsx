'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveVehicleAction, deleteVehicleAction } from '@/app/actions'
import { validateVehiclePayload } from '@/lib/utils/vehicle-form'
import type { Vehicle } from '@/types/app.types'

interface VehicleFormProps {
  initialData?: Vehicle
  mode: 'create' | 'edit'
}

export default function VehicleForm({ initialData, mode }: VehicleFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    patente: initialData?.patente ?? '',
    marca: initialData?.marca ?? '',
    modelo: initialData?.modelo ?? '',
    anio: String(initialData?.anio ?? new Date().getFullYear()),
    km_actual: String(initialData?.km_actual ?? '0'),
    is_active: initialData?.is_active ?? true,
    proveedor_arriendo: initialData?.proveedor_arriendo ?? '',
    contrato_pertenece: initialData?.contrato_pertenece ?? '',
    fecha_revision_tecnica: initialData?.fecha_revision_tecnica ?? '',
    vencimiento_seguro: initialData?.vencimiento_seguro ?? '',
    vencimiento_permiso: initialData?.vencimiento_permiso ?? '',
    vencimiento_extintor: initialData?.vencimiento_extintor ?? '',
    certificado_torque_ruedas: initialData?.certificado_torque_ruedas ?? '',
    vencimiento_torque_ruedas: initialData?.vencimiento_torque_ruedas ?? '',
    certificado_gps: initialData?.certificado_gps ?? '',
    vencimiento_gps: initialData?.vencimiento_gps ?? '',
  })

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const rawPayload = {
        patente: form.patente,
        marca: form.marca,
        modelo: form.modelo,
        anio: parseInt(form.anio, 10),
        km_actual: parseInt(form.km_actual, 10) || 0,
        is_active: form.is_active,
        proveedor_arriendo: form.proveedor_arriendo,
        contrato_pertenece: form.contrato_pertenece || null,
        fecha_revision_tecnica: form.fecha_revision_tecnica || null,
        vencimiento_seguro: form.vencimiento_seguro || null,
        vencimiento_permiso: form.vencimiento_permiso || null,
        vencimiento_extintor: form.vencimiento_extintor || null,
        certificado_torque_ruedas: form.certificado_torque_ruedas,
        vencimiento_torque_ruedas: form.vencimiento_torque_ruedas || null,
        certificado_gps: form.certificado_gps,
        vencimiento_gps: form.vencimiento_gps || null,
      }

      const validated = validateVehiclePayload(rawPayload)
      if (!validated.ok) {
        setError(validated.error)
        return
      }

      const res = await saveVehicleAction(mode, initialData?.id, validated.data)

      if (!res.ok) {
        setError(res.error || 'Error al guardar vehículo')
        return
      }

      router.push(`/vehicles/${res.data.id}`)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('¿Seguro que deseas desactivar este vehículo?')) return
    setLoading(true)
    setError('')
    try {
      const res = await deleteVehicleAction(initialData!.id)
      if (!res.ok) {
        setError(res.error || 'Error al desactivar vehículo')
        return
      }
      router.push('/vehicles')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="login-error" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Datos básicos */}
      <div className="form-section">
        <div className="form-section-title">Datos del Vehículo</div>
        <div className="form-grid form-grid-3">
          <div className="form-group">
            <label className="form-label required">Patente</label>
            <input
              className="form-input"
              value={form.patente}
              onChange={e => set('patente', e.target.value.toUpperCase())}
              placeholder="ABCD12"
              required
              maxLength={10}
              style={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em' }}
            />
            <span className="form-hint">Formato: AB1234 o ABCD12</span>
          </div>
          <div className="form-group">
            <label className="form-label required">Marca</label>
            <input className="form-input" value={form.marca} onChange={e => set('marca', e.target.value)} placeholder="Toyota" required />
          </div>
          <div className="form-group">
            <label className="form-label required">Modelo</label>
            <input className="form-input" value={form.modelo} onChange={e => set('modelo', e.target.value)} placeholder="Hilux" required />
          </div>
          <div className="form-group">
            <label className="form-label required">Año</label>
            <input className="form-input" type="number" value={form.anio} onChange={e => set('anio', e.target.value)} min={1990} max={2035} required />
          </div>
          <div className="form-group">
            <label className="form-label">Km Actual</label>
            <input className="form-input" type="number" value={form.km_actual} onChange={e => set('km_actual', e.target.value)} min={0} />
          </div>
          <div className="form-group">
            <label className="form-label">Estado</label>
            <div className="toggle-wrapper" style={{ marginTop: 8 }}>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => set('is_active', e.target.checked)}
                />
                <span className="toggle-track" />
              </label>
              <span style={{ fontSize: '0.875rem', color: form.is_active ? 'var(--status-ok)' : 'var(--text-muted)' }}>
                {form.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Asignación */}
      <div className="form-section">
        <div className="form-section-title">Asignación</div>
        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label className="form-label required">Proveedor de Arriendo</label>
            <input className="form-input" value={form.proveedor_arriendo} onChange={e => set('proveedor_arriendo', e.target.value)} placeholder="Nombre proveedor" required />
          </div>
          <div className="form-group">
            <label className="form-label">Contrato</label>
            <input className="form-input" value={form.contrato_pertenece} onChange={e => set('contrato_pertenece', e.target.value)} placeholder="Código o nombre del contrato" />
          </div>
        </div>
      </div>

      {/* Documentos con vencimiento */}
      <div className="form-section">
        <div className="form-section-title">Documentos y Vencimientos</div>
        <div className="form-grid form-grid-3">
          <div className="form-group">
            <label className="form-label required">Revisión Técnica</label>
            <input className="form-input" type="date" value={form.fecha_revision_tecnica} onChange={e => set('fecha_revision_tecnica', e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Vencimiento Seguro</label>
            <input className="form-input" type="date" value={form.vencimiento_seguro} onChange={e => set('vencimiento_seguro', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Permiso Circulación</label>
            <input className="form-input" type="date" value={form.vencimiento_permiso} onChange={e => set('vencimiento_permiso', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Extintor (vencimiento)</label>
            <input className="form-input" type="date" value={form.vencimiento_extintor} onChange={e => set('vencimiento_extintor', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Certificados */}
      <div className="form-section">
        <div className="form-section-title">Certificados</div>
        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label className="form-label">Certificado Torque de Ruedas (link)</label>
            <input
              className="form-input"
              type="text"
              inputMode="url"
              value={form.certificado_torque_ruedas}
              onChange={e => set('certificado_torque_ruedas', e.target.value)}
              placeholder="drive.google.com/... o https://..."
            />
            <span className="form-hint">Opcional. Puede omitir https://</span>
          </div>
          <div className="form-group">
            <label className="form-label">Validez Torque (fecha)</label>
            <input className="form-input" type="date" value={form.vencimiento_torque_ruedas} onChange={e => set('vencimiento_torque_ruedas', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Certificado GPS (link)</label>
            <input
              className="form-input"
              type="text"
              inputMode="url"
              value={form.certificado_gps}
              onChange={e => set('certificado_gps', e.target.value)}
              placeholder="drive.google.com/... o https://..."
            />
            <span className="form-hint">Opcional. Puede omitir https://</span>
          </div>
          <div className="form-group">
            <label className="form-label">Validez GPS (fecha)</label>
            <input className="form-input" type="date" value={form.vencimiento_gps} onChange={e => set('vencimiento_gps', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', paddingTop: 8 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Guardando…</>
            ) : (
              mode === 'create' ? 'Crear vehículo' : 'Guardar cambios'
            )}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancelar
          </button>
        </div>
        {mode === 'edit' && initialData?.is_active && (
          <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={loading}>
            Desactivar
          </button>
        )}
      </div>
    </form>
  )
}
