import type { PublicPrototype } from '@/lib/public-content/types'
import type { AnalyticsPrototypeCardPlacement } from '@/lib/analytics/events'

import { PrototypeCard } from './PrototypeCard'

export function PrototypeGrid({
  placement,
  prototypes,
}: {
  placement: AnalyticsPrototypeCardPlacement
  prototypes: PublicPrototype[]
}) {
  return (
    <ul className="prototype-grid">
      {prototypes.map((prototype) => (
        <li key={prototype.id}>
          <PrototypeCard placement={placement} prototype={prototype} />
        </li>
      ))}
    </ul>
  )
}
