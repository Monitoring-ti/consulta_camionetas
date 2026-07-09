'use client'

import { useState } from 'react'

interface PhotoViewerProps {
  src: string
  alt: string
}

export function PhotoViewer({ src, alt }: PhotoViewerProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="photo-thumb" onClick={() => setOpen(true)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" />
      </div>
      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="modal-img"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
