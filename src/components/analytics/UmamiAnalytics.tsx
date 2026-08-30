import { resolveUmamiAnalyticsConfig } from '@/lib/analytics/umami'

import { UmamiTrackerScript } from './UmamiTrackerScript'

export function UmamiAnalytics() {
  const config = resolveUmamiAnalyticsConfig(process.env)

  if (!config) return null

  return <UmamiTrackerScript config={config} />
}
