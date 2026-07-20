'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { permanentlyDeleteVehicleAction } from '@/app/actions'

export default function PermanentDeleteVehicleButton({
  vehicleId,
  patente,
}: {
  vehicleId: string
  patente: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    const ok1 = confirm(
      `¿Eliminar definitivamente ${patente}?\n\nSolo vehículos desactivados pueden eliminarse. Se registrará quién y cuándo.`
    )
    if (!ok1) return
    const typed = window.prompt(`Para confirmar, escriba la patente exactamente:\n${patente}`)
    if (typed === null) return
    if (typed.trim().toUpperCase() !== patente.trim().toUpperCase()) {
      setError('La patente no coincide. Eliminación cancelada.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await permanentlyDeleteVehicleAction(vehicleId)
      if (!res.ok) {
        setError(res.error || 'No se pudo eliminar')
        return
      }
      router.push('/vehicles#historial')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      <button type="button" className="btn btn-danger" onClick={handleClick} disabled={loading}>
        {loading ? 'Eliminando…' : 'Eliminar'}
      </button>
      {error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--status-danger)', maxWidth: 280, textAlign: 'right' }}>
          {error}
        </span>
      )}
    </div>
  )
}
