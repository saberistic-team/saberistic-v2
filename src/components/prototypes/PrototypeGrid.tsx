import type { PublicPrototype } from '@/lib/public-content/types'

import { PrototypeCard } from './PrototypeCard'

export function PrototypeGrid({ prototypes }: { prototypes: PublicPrototype[] }) {
  return (
    <ul className="prototype-grid">
      {prototypes.map((prototype) => (
        <li key={prototype.id}>
          <PrototypeCard prototype={prototype} />
        </li>
      ))}
    </ul>
  )
}
