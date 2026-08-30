'use client'

import Script from 'next/script'

import { analyticsReadyEventName } from '@/lib/analytics/events'
import type { UmamiAnalyticsConfig } from '@/lib/analytics/umami'

export function UmamiTrackerScript({ config }: { config: UmamiAnalyticsConfig }) {
  function announceTrackerReady() {
    window.dispatchEvent(new Event(analyticsReadyEventName))
  }

  return (
    <Script
      data-before-send="saberisticUmamiBeforeSend"
      data-do-not-track="true"
      data-domains={config.domains}
      data-exclude-hash="true"
      data-exclude-search="true"
      data-performance="true"
      data-website-id={config.websiteId}
      id="umami-analytics"
      onReady={announceTrackerReady}
      src={config.scriptUrl}
      strategy="afterInteractive"
    />
  )
}
