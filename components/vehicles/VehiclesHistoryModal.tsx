'use client'

import { useEffect, useId, useRef } from 'react'
import VehiclesTable from '@/components/vehicles/VehiclesTable'
import type { Vehicle } from '@/types/app.types'

type Props = {
  open: boolean
  onClose: () => void
  vehicles: Vehicle[]
}

export default function VehiclesHistoryModal({ open, onClose, vehicles }: Props) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-panel vehicles-history-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id={titleId} className="modal-title">
              Historial de vehículos
            </h2>
            <p className="modal-subtitle">
              {vehicles.length} desactivado{vehicles.length === 1 ? '' : 's'}. Puede reactivar o eliminar
              (queda registro de quién y cuándo).
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            aria-label="Cerrar historial"
          >
            Cerrar
          </button>
        </div>
        <div className="modal-body">
          <VehiclesTable
            vehicles={vehicles}
            mode="history"
            emptyMessage="Aún no hay vehículos desactivados"
            compact
          />
        </div>
      </div>
    </div>
  )
}
