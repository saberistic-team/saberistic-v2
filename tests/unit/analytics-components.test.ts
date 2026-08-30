// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/react'
import { createElement, StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TrackEventOnMount } from '@/components/analytics/TrackEventOnMount'
import { TrackedAnchor, TrackedLink } from '@/components/analytics/TrackedLink'
import { UmamiTrackerScript } from '@/components/analytics/UmamiTrackerScript'
import { analyticsReadyEventName } from '@/lib/analytics/events'

afterEach(() => {
  cleanup()
  window.umami = undefined
})

describe('analytics client boundaries', () => {
  it('renders the approved tracker controls and announces readiness', () => {
    const onReady = vi.fn()
    window.addEventListener(analyticsReadyEventName, onReady, { once: true })

    render(
      createElement(UmamiTrackerScript, {
        config: {
          domains: 'saberistic.com,www.saberistic.com',
          scriptUrl: 'https://umami.saberistic.com/script.js',
          websiteId: '94db1cb1-74f4-4a40-ad6c-962362670409',
        },
      }),
    )

    const script = document.querySelector<HTMLScriptElement>('#umami-analytics')

    expect(script?.getAttribute('data-before-send')).toBe('saberisticUmamiBeforeSend')
    expect(script?.getAttribute('data-domains')).toBe('saberistic.com,www.saberistic.com')
    expect(script?.getAttribute('data-exclude-search')).toBe('true')
    expect(script?.getAttribute('data-exclude-hash')).toBe('true')
    expect(script?.getAttribute('data-do-not-track')).toBe('true')

    script?.dispatchEvent(new Event('load'))
    expect(onReady).toHaveBeenCalledOnce()
  })

  it('tracks an internal link while preserving its consumer click handler', () => {
    const track = vi.fn()
    const onClick = vi.fn()
    window.umami = { track }

    const view = render(
      createElement(
        TrackedLink,
        {
          analyticsEvent: {
            data: { cta: 'check_readiness', placement: 'header' },
            name: 'primary_cta_clicked',
          },
          href: '/readiness',
          onClick: (event) => {
            onClick(event)
            event.preventDefault()
          },
        },
        'Check readiness',
      ),
    )

    const link = view.getByRole('link', { name: 'Check readiness' })
    const result = fireEvent.click(link)

    expect(result).toBe(false)
    expect(onClick).toHaveBeenCalledOnce()
    expect(track).toHaveBeenCalledWith('primary_cta_clicked', {
      cta: 'check_readiness',
      placement: 'header',
    })
  })

  it('tracks an external launch without changing its href', () => {
    const track = vi.fn()
    window.umami = { track }

    const view = render(
      createElement(
        TrackedAnchor,
        {
          analyticsEvent: {
            data: { placement: 'detail', prototype: 'back-then' },
            name: 'prototype_launch',
          },
          href: 'https://example.com/demo',
          onClick: (event) => event.preventDefault(),
        },
        'Open prototype',
      ),
    )

    const link = view.getByRole('link', { name: 'Open prototype' })
    fireEvent.click(link)

    expect(link.getAttribute('href')).toBe('https://example.com/demo')
    expect(track).toHaveBeenCalledWith('prototype_launch', {
      placement: 'detail',
      prototype: 'back-then',
    })
  })

  it('emits a detail impression only once under React Strict Mode', () => {
    const track = vi.fn()
    window.umami = { track }

    render(
      createElement(
        StrictMode,
        null,
        createElement(TrackEventOnMount, {
          event: {
            data: { prototype: 'back-then', status: 'prototype' },
            name: 'prototype_view',
          },
        }),
      ),
    )

    expect(track).toHaveBeenCalledOnce()
    expect(track).toHaveBeenCalledWith('prototype_view', {
      prototype: 'back-then',
      status: 'prototype',
    })
  })

  it('waits for a delayed tracker without polling or blocking the page', () => {
    const track = vi.fn()

    render(
      createElement(TrackEventOnMount, {
        event: {
          data: { prototype: 'back-then', status: 'prototype' },
          name: 'prototype_view',
        },
      }),
    )

    expect(track).not.toHaveBeenCalled()

    window.umami = { track }
    window.dispatchEvent(new Event(analyticsReadyEventName))
    window.dispatchEvent(new Event(analyticsReadyEventName))

    expect(track).toHaveBeenCalledOnce()
  })
})
