import Link from 'next/link'

const profiles = [
  {
    description: 'Next.js, managed database, Stripe, OpenRouter',
    href: '/readiness?profile=ai-saas',
    label: 'AI-generated SaaS',
  },
  {
    description: 'Tools, retrieval, memory, human approval',
    href: '/readiness?profile=agent-workflow',
    label: 'Agent workflow',
  },
  {
    description: 'KYC, wallet, on/off-ramp, webhooks',
    href: '/readiness?profile=payments',
    label: 'Payments product',
  },
  {
    description: 'Start without a pre-filled architecture profile',
    href: '/readiness?profile=custom',
    label: 'Something else',
  },
]

export function ReadinessPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'readiness-card readiness-card--compact' : 'readiness-card'}>
      <div className="readiness-card__header">
        <span>READINESS CHECK</span>
        <span>01 / 05</span>
      </div>
      <fieldset>
        <legend>Which profile is closest to what you’re building?</legend>
        <div className="readiness-options">
          {profiles.map((profile, index) => (
            <Link href={profile.href} key={profile.href}>
              <span aria-hidden="true" className="readiness-options__index">
                0{index + 1}
              </span>
              <span>
                <strong>{profile.label}</strong>
                <small>{profile.description}</small>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </fieldset>
      <p className="readiness-card__trust">
        3 minutes. No code upload. Directional assessment—not a security or code audit.
      </p>
    </div>
  )
}
