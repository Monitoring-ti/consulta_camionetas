import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import InspectorForm from '@/components/inspectors/InspectorForm'
import Link from 'next/link'
import type { Inspector } from '@/types/app.types'

export default async function EditInspectorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inspectors')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return notFound()

  const inspector = data as Inspector

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb">
          <Link href="/inspectors">Trabajadores</Link>
          <span className="breadcrumb-sep">/</span>
          <span>{inspector.nombre}</span>
          <span className="breadcrumb-sep">/</span>
          <span>Editar</span>
        </div>
        <h1 className="page-title">Editar Trabajador — {inspector.nombre}</h1>
        <p className="page-subtitle">{inspector.cargo}</p>
      </div>
      <div className="page-body">
        <div className="card">
          <div className="card-body">
            <InspectorForm mode="edit" initialData={inspector} />
          </div>
        </div>
      </div>
    </>
  )
}
