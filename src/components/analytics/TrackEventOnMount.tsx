'use client'

import { useEffect, useMemo, useRef } from 'react'

import {
  analyticsReadyEventName,
  trackAnalyticsEvent,
  type AnalyticsEvent,
} from '@/lib/analytics/events'

export function TrackEventOnMount({ event }: { event: AnalyticsEvent }) {
  const eventKey = useMemo(() => JSON.stringify(event), [event])
  const trackedKey = useRef<string | null>(null)

  useEffect(() => {
    if (trackedKey.current === eventKey) return

    function trackOnce() {
      if (trackedKey.current === eventKey) return
      if (trackAnalyticsEvent(event)) trackedKey.current = eventKey
    }

    trackOnce()

    if (trackedKey.current !== eventKey) {
      window.addEventListener(analyticsReadyEventName, trackOnce, { once: true })
    }

    return () => window.removeEventListener(analyticsReadyEventName, trackOnce)
  }, [event, eventKey])

  return null
}
