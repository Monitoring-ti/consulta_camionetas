'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { reactivateVehicleAction } from '@/app/actions'

export default function ReactivateVehicleButton({ vehicleId }: { vehicleId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    if (!confirm('¿Reactivar este vehículo y devolverlo a la flota activa?')) return
    setLoading(true)
    setError('')
    try {
      const res = await reactivateVehicleAction(vehicleId)
      if (!res.ok) {
        setError(res.error || 'No se pudo reactivar')
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      <button type="button" className="btn btn-primary" onClick={handleClick} disabled={loading}>
        {loading ? 'Reactivando…' : 'Reactivar'}
      </button>
      {error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--status-danger)', maxWidth: 260, textAlign: 'right' }}>
          {error}
        </span>
      )}
    </div>
  )
}
