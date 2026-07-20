import { formatPatente } from '@/lib/utils/formatters'

type ChileanPlateProps = {
  patente: string
  size?: 'sm' | 'md'
  muted?: boolean
  className?: string
}

/** Placa gráfica estilo patente chilena (formato XXXX-XX) */
export default function ChileanPlate({
  patente,
  size = 'sm',
  muted = false,
  className = '',
}: ChileanPlateProps) {
  const label = formatPatente(patente)

  return (
    <span
      className={`chilean-plate chilean-plate--${size}${muted ? ' chilean-plate--muted' : ''} ${className}`.trim()}
      title={label}
      aria-label={`Patente ${label}`}
    >
      <span className="chilean-plate__band" aria-hidden>
        <span className="chilean-plate__star">★</span>
        <span className="chilean-plate__cl">CL</span>
      </span>
      <span className="chilean-plate__code">{label}</span>
    </span>
  )
}
