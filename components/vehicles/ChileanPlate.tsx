import { formatPatente } from '@/lib/utils/formatters'

type ChileanPlateProps = {
  patente: string
  size?: 'sm' | 'md'
  muted?: boolean
  className?: string
}

function plateParts(patente: string): { a: string; b: string; n: string } | null {
  const p = patente.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6)
  if (p.length < 6) {
    return {
      a: p.slice(0, 2).padEnd(2, '·'),
      b: p.slice(2, 4).padEnd(2, '·'),
      n: p.slice(4, 6).padEnd(2, '·'),
    }
  }
  return { a: p.slice(0, 2), b: p.slice(2, 4), n: p.slice(4, 6) }
}

/** Escudo con estrella (símbolo de patente chilena) */
function ShieldStar({ size }: { size: 'sm' | 'md' }) {
  const wh = size === 'md' ? 18 : 13
  return (
    <svg
      className="chilean-plate__shield"
      width={wh}
      height={wh}
      viewBox="0 0 24 28"
      aria-hidden
    >
      <path
        d="M12 1.5 L20.5 5.2 V13.2 C20.5 19.2 16.8 24.2 12 26.5 C7.2 24.2 3.5 19.2 3.5 13.2 V5.2 Z"
        fill="#111"
      />
      <path
        d="M12 8.2 L13.3 11.4 L16.8 11.6 L14.1 13.8 L15 17.2 L12 15.4 L9 17.2 L9.9 13.8 L7.2 11.6 L10.7 11.4 Z"
        fill="#fff"
      />
    </svg>
  )
}

/** Placa gráfica estilo patente chilena: AA ★ BB · 12 + CHILE */
export default function ChileanPlate({
  patente,
  size = 'sm',
  muted = false,
  className = '',
}: ChileanPlateProps) {
  const label = formatPatente(patente)
  const parts = plateParts(patente)

  return (
    <span
      className={`chilean-plate chilean-plate--${size}${muted ? ' chilean-plate--muted' : ''} ${className}`.trim()}
      title={label}
      aria-label={`Patente ${label}`}
    >
      <span className="chilean-plate__row" aria-hidden>
        <span className="chilean-plate__chars">{parts?.a}</span>
        <ShieldStar size={size} />
        <span className="chilean-plate__chars">{parts?.b}</span>
        <span className="chilean-plate__dot">·</span>
        <span className="chilean-plate__chars">{parts?.n}</span>
      </span>
      <span className="chilean-plate__country">CHILE</span>
    </span>
  )
}
