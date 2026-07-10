import InspectorForm from '@/components/inspectors/InspectorForm'
import Link from 'next/link'

export default function NewInspectorPage() {
  return (
    <>
      <div className="page-header">
        <div className="breadcrumb">
          <Link href="/inspectors">Trabajadores</Link>
          <span className="breadcrumb-sep">/</span>
          <span>Nuevo</span>
        </div>
        <h1 className="page-title">Nuevo Trabajador</h1>
        <p className="page-subtitle">Completa los datos para registrar un nuevo trabajador / inspector</p>
      </div>
      <div className="page-body">
        <div className="card">
          <div className="card-body">
            <InspectorForm mode="create" />
          </div>
        </div>
      </div>
    </>
  )
}
