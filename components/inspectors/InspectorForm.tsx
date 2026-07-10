'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Inspector, InspectorInsert, InspectorUpdate } from '@/types/app.types'

interface InspectorFormProps {
  initialData?: Inspector
  mode: 'create' | 'edit'
}

export default function InspectorForm({ initialData, mode }: InspectorFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nombre: initialData?.nombre ?? '',
    cargo: initialData?.cargo ?? '',
    rut: initialData?.rut ?? '',
    telefono: initialData?.telefono ?? '',
    tipo_usuario: initialData?.tipo_usuario ?? 'Inspector',
    is_active: initialData?.is_active ?? true,
    vencimiento_licencia_municipal: initialData?.vencimiento_licencia_municipal ?? '',
    vencimiento_licencia_interna: initialData?.vencimiento_licencia_interna ?? '',
  })

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()

    const payload = {
      nombre: form.nombre.trim(),
      cargo: form.cargo.trim(),
      rut: form.rut.trim() || null,
      telefono: form.telefono.trim() || null,
      tipo_usuario: form.tipo_usuario,
      is_active: form.is_active,
      vencimiento_licencia_municipal: form.vencimiento_licencia_municipal || null,
      vencimiento_licencia_interna: form.vencimiento_licencia_interna || null,
    }

    let result
    if (mode === 'create') {
      result = await (supabase.from('inspectors') as any).insert(payload).select().single()
    } else {
      result = await (supabase.from('inspectors') as any).update(payload).eq('id', initialData!.id).select().single()
    }

    if (result.error) {
      setError(result.error.message)
      setLoading(false)
      return
    }

    router.push(`/inspectors`)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('¿Seguro que deseas desactivar este trabajador?')) return
    const supabase = createClient()
    await (supabase.from('inspectors') as any).update({ is_active: false }).eq('id', initialData!.id)
    router.push('/inspectors')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="login-error" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Datos básicos */}
      <div className="form-section">
        <div className="form-section-title">Datos del Trabajador</div>
        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label className="form-label required">Nombre Completo</label>
            <input
              className="form-input"
              value={form.nombre}
              onChange={e => set('nombre', e.target.value)}
              placeholder="Juan Pérez"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label required">Cargo</label>
            <input
              className="form-input"
              value={form.cargo}
              onChange={e => set('cargo', e.target.value)}
              placeholder="Conductor / Operador / Inspector"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">RUT</label>
            <input
              className="form-input"
              value={form.rut}
              onChange={e => set('rut', e.target.value)}
              placeholder="12.345.678-9"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Teléfono</label>
            <input
              className="form-input"
              value={form.telefono}
              onChange={e => set('telefono', e.target.value)}
              placeholder="+56 9 1234 5678"
            />
          </div>
        </div>
      </div>

      {/* Permisos / Tipo */}
      <div className="form-section">
        <div className="form-section-title">Configuración y Rol</div>
        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label className="form-label required">Rol en Sistema</label>
            <select
              className="form-input"
              value={form.tipo_usuario}
              onChange={e => set('tipo_usuario', e.target.value)}
              required
              style={{ height: '42px', padding: '0 12px' }}
            >
              <option value="Inspector">Inspector / Trabajador Normal</option>
              <option value="Admin">Administrador</option>
            </select>
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

      {/* Vencimiento de Licencias / Documentos */}
      <div className="form-section">
        <div className="form-section-title">Documentos y Licencias</div>
        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label className="form-label">Vencimiento Licencia Municipal</label>
            <input
              className="form-input"
              type="date"
              value={form.vencimiento_licencia_municipal}
              onChange={e => set('vencimiento_licencia_municipal', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Vencimiento Licencia Interna</label>
            <input
              className="form-input"
              type="date"
              value={form.vencimiento_licencia_interna}
              onChange={e => set('vencimiento_licencia_interna', e.target.value)}
            />
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
              mode === 'create' ? 'Crear Trabajador' : 'Guardar cambios'
            )}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.back()}
          >
            Cancelar
          </button>
        </div>
        {mode === 'edit' && initialData?.is_active && (
          <button type="button" className="btn btn-danger" onClick={handleDelete}>
            Desactivar
          </button>
        )}
      </div>
    </form>
  )
}
