'use client'

import { useState } from 'react'
import Link from 'next/link'
import VehiclesTable from '@/components/vehicles/VehiclesTable'
import VehiclesHistoryModal from '@/components/vehicles/VehiclesHistoryModal'
import type { Vehicle } from '@/types/app.types'

type Props = {
  activeList: Vehicle[]
  historyList: Vehicle[]
  errorMessage?: string | null
}

export default function VehiclesFleetClient({
  activeList,
  historyList,
  errorMessage,
}: Props) {
  const [historyOpen, setHistoryOpen] = useState(false)

  return (
    <>
      <div
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
          paddingTop: 24,
        }}
      >
        <div>
          <h1 className="page-title">Vehículos</h1>
          <p className="page-subtitle">
            {activeList.length} activo{activeList.length === 1 ? '' : 's'} en flota
            {historyList.length > 0
              ? ` · ${historyList.length} en historial`
              : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setHistoryOpen(true)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Historial
            {historyList.length > 0 ? ` (${historyList.length})` : ''}
          </button>
          <Link href="/vehicles/new" className="btn btn-action">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuevo vehículo
          </Link>
        </div>
      </div>

      <div className="page-body">
        {errorMessage && (
          <div className="login-error" style={{ marginBottom: 16 }}>
            Error al cargar vehículos: {errorMessage}
          </div>
        )}

        <VehiclesTable
          vehicles={activeList}
          mode="active"
          showCreateCta
          emptyMessage="No hay vehículos activos en la flota"
          compact
        />
      </div>

      <VehiclesHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        vehicles={historyList}
      />
    </>
  )
}
