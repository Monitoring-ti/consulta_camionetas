'use client'

import { useEffect, useState } from 'react'

interface PhotoViewerProps {
  src: string
  alt: string
  /** Visual size / treatment */
  variant?: 'default' | 'sm' | 'signature'
  /** Optional caption under the thumb */
  label?: string
}

export function PhotoViewer({ src, alt, variant = 'default', label }: PhotoViewerProps) {
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (failed) {
    return (
      <>
        <div className={`photo-thumb photo-thumb--${variant} photo-thumb--empty`} title="No se pudo cargar la imagen">
          <span className="photo-empty-msg">Imagen no disponible</span>
        </div>
        {label && <div className="photo-label">{label}</div>}
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        className={`photo-thumb photo-thumb--${variant}`}
        onClick={() => setOpen(true)}
        aria-label={`Ampliar: ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
        />
        <span className="photo-zoom-hint" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </span>
      </button>
      {label && <div className="photo-label">{label}</div>}
      {open && (
        <div
          className="modal-overlay"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={alt}
        >
          <div className="modal-img-wrap" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="modal-img" />
            <div className="modal-caption">
              <span>{alt}</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** Placeholder when a vehicle angle photo is missing */
export function PhotoPlaceholder({ label }: { label: string }) {
  return (
    <div>
      <div className="photo-thumb photo-thumb--empty" aria-label={`${label}: sin foto`}>
        <span className="photo-empty-msg">Sin foto</span>
      </div>
      <div className="photo-label">{label}</div>
    </div>
  )
}
