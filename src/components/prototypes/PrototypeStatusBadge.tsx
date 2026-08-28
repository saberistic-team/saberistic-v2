import type { PrototypeStatus } from '@/lib/public-content/types'

export function PrototypeStatusBadge({ status }: { status: PrototypeStatus }) {
  return <span className={`status status--${status}`}>{status}</span>
}
