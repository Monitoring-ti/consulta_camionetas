'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface VehicleQRProps {
  patente: string
  marca: string
  modelo: string
}

export default function VehicleQR({ patente, marca, modelo }: VehicleQRProps) {
  const [qrUrl, setQrUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)
  
  const checkAppUrl = process.env.NEXT_PUBLIC_CHECK_APP_URL || 'http://localhost:3000'
  const targetUrl = `${checkAppUrl}/check?patente=${patente}`
  
  useEffect(() => {
    QRCode.toDataURL(targetUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#0f172a', // Slate 900
        light: '#ffffff'
      }
    })
      .then(url => setQrUrl(url))
      .catch(err => console.error(err))
  }, [targetUrl])

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = qrUrl
    link.download = `QR_${patente}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir QR - ${patente}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #fff;
              color: #333;
            }
            .qr-card {
              border: 3px solid #000;
              border-radius: 16px;
              padding: 30px;
              text-align: center;
              max-width: 350px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .company-name {
              font-size: 1.2rem;
              font-weight: 800;
              letter-spacing: 0.1em;
              color: #0f172a;
              margin-bottom: 5px;
              text-transform: uppercase;
            }
            .title {
              font-size: 0.9rem;
              color: #64748b;
              margin-bottom: 20px;
              font-weight: 600;
            }
            .qr-image {
              width: 250px;
              height: 250px;
              margin-bottom: 20px;
            }
            .patente {
              font-size: 2.2rem;
              font-weight: 900;
              color: #0f172a;
              margin: 10px 0;
              letter-spacing: 0.05em;
              border: 2px solid #0f172a;
              padding: 5px 15px;
              border-radius: 8px;
              display: inline-block;
              background-color: #f8fafc;
            }
            .vehicle-info {
              font-size: 0.95rem;
              color: #475569;
              margin-bottom: 15px;
              font-weight: 500;
            }
            .instructions {
              font-size: 0.8rem;
              color: #64748b;
              margin-top: 15px;
              line-height: 1.4;
            }
            @media print {
              body {
                height: auto;
              }
              .qr-card {
                border: 3px solid #000;
                box-shadow: none;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-card">
            <div class="company-name">MAT MONITORING</div>
            <div class="title">INSPECCIÓN DE VEHÍCULO</div>
            <img class="qr-image" src="${qrUrl}" alt="Código QR ${patente}" />
            <div>
              <div class="patente">${patente}</div>
            </div>
            <div class="vehicle-info">${marca} ${modelo}</div>
            <div class="instructions">
              Escanee este código QR para ingresar directamente al check list de este vehículo.
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-header">
        <span className="card-title">Código QR de Inspección</span>
      </div>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {qrUrl ? (
          <>
            <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <img src={qrUrl} alt={`QR ${patente}`} style={{ width: 180, height: 180, display: 'block' }} />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', margin: '0 10px', lineHeight: 1.4 }}>
              Escanee para ir directamente al Checklist con la patente <strong>{patente}</strong> pre-cargada.
            </p>
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button onClick={handleDownload} className="btn btn-secondary" style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Descargar
              </button>
              <button onClick={handlePrint} className="btn btn-secondary" style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Imprimir
              </button>
            </div>
            <button onClick={handleCopy} className="btn btn-secondary btn-sm" style={{ width: '100%', padding: '6px 12px', fontSize: '0.78rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, color: copied ? '#10b981' : 'inherit', cursor: 'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {copied ? '¡Copiado!' : 'Copiar Enlace'}
            </button>
          </>
        ) : (
          <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Generando QR...
          </div>
        )}
      </div>
    </div>
  )
}
