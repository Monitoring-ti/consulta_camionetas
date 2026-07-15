import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import VehicleForm from '@/components/vehicles/VehicleForm'
import Link from 'next/link'
import type { Vehicle } from '@/types/app.types'

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return notFound()

  const vehicle = data as Vehicle

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb">
          <Link href="/vehicles">Vehículos</Link>
          <span className="breadcrumb-sep">/</span>
          <Link href={`/vehicles/${id}`}>{vehicle.patente}</Link>
          <span className="breadcrumb-sep">/</span>
          <span>Editar</span>
        </div>
        <h1 className="page-title">Editar Vehículo — {vehicle.patente}</h1>
        <p className="page-subtitle">{vehicle.marca} {vehicle.modelo} {vehicle.anio}</p>
      </div>
      <div className="page-body">
        <div className="card">
          <div className="card-body">
            <VehicleForm mode="edit" initialData={vehicle} />
          </div>
        </div>
      </div>
    </>
  )
}
