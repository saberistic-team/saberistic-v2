import type { PrototypeStatus } from '@/lib/public-content/types'

type PrototypePosterProps = {
  problem?: string
  status: PrototypeStatus
  title: string
}

export function PrototypePoster({ problem, status, title }: PrototypePosterProps) {
  return (
    <div aria-hidden="true" className={`prototype-poster prototype-poster--${status}`}>
      <div className="prototype-poster__coordinates">
        <span>BUILD NOTE</span>
        <span>{status.toUpperCase()}</span>
      </div>
      <div className="prototype-poster__title">{title}</div>
      <div className="prototype-poster__trace">
        <span />
        <span />
        <span />
      </div>
      <p>{problem ?? 'A focused experiment with its current boundaries left visible.'}</p>
    </div>
  )
}
