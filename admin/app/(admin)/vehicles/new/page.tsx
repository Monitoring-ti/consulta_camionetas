import VehicleForm from '@/components/vehicles/VehicleForm'
import Link from 'next/link'

export default function NewVehiclePage() {
  return (
    <>
      <div className="page-header">
        <div className="breadcrumb">
          <Link href="/vehicles">Vehículos</Link>
          <span className="breadcrumb-sep">/</span>
          <span>Nuevo</span>
        </div>
        <h1 className="page-title">Nuevo Vehículo</h1>
        <p className="page-subtitle">Completa los datos para registrar un vehículo en la flota</p>
      </div>
      <div className="page-body">
        <div className="card">
          <div className="card-body">
            <VehicleForm mode="create" />
          </div>
        </div>
      </div>
    </>
  )
}
