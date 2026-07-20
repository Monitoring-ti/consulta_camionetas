'use client'

import type { InspectionDetail } from '@/types/app.types'
import { PhotoViewer } from '@/components/inspections/PhotoViewer'

type Props = {
  items: InspectionDetail[]
}

/** Galería de revisión para ítems con problema (fotos de hallazgo del checklist). */
export default function HallazgoEvidence({ items }: Props) {
  if (items.length === 0) return null

  const withPhoto = items.filter(i => i.foto_url)
  const withoutPhoto = items.filter(i => !i.foto_url)

  return (
    <div className="card hallazgo-evidence" style={{ marginBottom: 24 }}>
      <div className="card-header">
        <span className="card-title">Evidencia de hallazgos</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {items.length} problema{items.length !== 1 ? 's' : ''}
          {withPhoto.length > 0
            ? ` · ${withPhoto.length} con foto`
            : ' · sin fotos adjuntas'}
        </span>
      </div>
      <div className="card-body">
        <p className="no-print" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
          Fotos y notas capturadas cuando un ítem del checklist se marcó en mal estado. Haz clic en la imagen para ampliar.
        </p>

        <div className="hallazgo-grid">
          {items.map(item => (
            <article
              key={item.id}
              className={`hallazgo-card ${item.is_blocking ? 'hallazgo-card--blocking' : ''}`}
            >
              <div className="hallazgo-card-media">
                {item.foto_url ? (
                  <PhotoViewer
                    src={item.foto_url}
                    alt={`Hallazgo: ${item.item_label}`}
                    variant="hallazgo"
                  />
                ) : (
                  <div className="photo-thumb photo-thumb--hallazgo photo-thumb--empty">
                    <span className="photo-empty-msg">Sin foto del hallazgo</span>
                  </div>
                )}
              </div>
              <div className="hallazgo-card-body">
                <div className="hallazgo-card-top">
                  <span className="hallazgo-section">{item.seccion}</span>
                  {item.is_blocking && (
                    <span className="checklist-blocking">BLOQUEANTE</span>
                  )}
                </div>
                <h4 className="hallazgo-title">{item.item_label}</h4>
                {item.descripcion ? (
                  <p className="hallazgo-desc">{item.descripcion}</p>
                ) : (
                  <p className="hallazgo-desc hallazgo-desc--muted">Sin descripción</p>
                )}
                {item.geotag && (
                  <p className="hallazgo-geo" title={item.geotag}>
                    GPS: {item.geotag}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>

        {withoutPhoto.length > 0 && withPhoto.length > 0 && (
          <p className="no-print" style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {withoutPhoto.length} hallazgo{withoutPhoto.length !== 1 ? 's' : ''} sin imagen adjunta.
          </p>
        )}
      </div>
    </div>
  )
}
