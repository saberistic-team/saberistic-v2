import Script from 'next/script'

import { resolveUmamiAnalyticsConfig } from '@/lib/analytics/umami'

export function UmamiAnalytics() {
  const config = resolveUmamiAnalyticsConfig(process.env)

  if (!config) return null

  return (
    <Script
      data-do-not-track="true"
      data-domains={config.domains}
      data-exclude-hash="true"
      data-exclude-search="true"
      data-performance="true"
      data-website-id={config.websiteId}
      id="umami-analytics"
      src={config.scriptUrl}
      strategy="afterInteractive"
    />
  )
}
