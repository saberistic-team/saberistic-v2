'use client'

import Link from 'next/link'
import type { ComponentProps, MouseEvent } from 'react'

import { trackAnalyticsEvent, type AnalyticsEvent } from '@/lib/analytics/events'

type TrackedLinkProps = ComponentProps<typeof Link> & {
  analyticsEvent: AnalyticsEvent
}

type TrackedAnchorProps = ComponentProps<'a'> & {
  analyticsEvent: AnalyticsEvent
}

export function TrackedLink({
  analyticsEvent,
  onClick,
  prefetch = false,
  ...props
}: TrackedLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    trackAnalyticsEvent(analyticsEvent)
    onClick?.(event)
  }

  return <Link {...props} onClick={handleClick} prefetch={prefetch} />
}

export function TrackedAnchor({ analyticsEvent, onClick, ...props }: TrackedAnchorProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    trackAnalyticsEvent(analyticsEvent)
    onClick?.(event)
  }

  return <a {...props} onClick={handleClick} />
}
