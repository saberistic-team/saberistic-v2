import { afterEach, describe, expect, it, vi } from 'vitest'

import { trackAnalyticsEvent, validateAnalyticsEvent } from '@/lib/analytics/events'

const validEvents = [
  {
    data: { cta: 'check_readiness', placement: 'home_hero' },
    name: 'primary_cta_clicked',
  },
  { data: { service: 'engineering_rescue' }, name: 'service_viewed' },
  {
    data: { placement: 'home', prototype: 'back-then', status: 'prototype' },
    name: 'prototype_card_clicked',
  },
  { data: { prototype: 'back-then', status: 'prototype' }, name: 'prototype_view' },
  {
    data: { placement: 'detail', prototype: 'back-then' },
    name: 'prototype_launch',
  },
  { data: { prototype: 'back-then' }, name: 'prototype_source_clicked' },
  {
    data: { note: 'harness-from-scratch', placement: 'home' },
    name: 'build_note_card_clicked',
  },
  { data: { note: 'harness-from-scratch' }, name: 'build_note_view' },
  { data: { note: 'harness-from-scratch' }, name: 'build_note_source_clicked' },
  {
    data: { entry: 'home_preview', mode: 'example' },
    name: 'readiness_started',
  },
] as const

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'window')
})

describe('analytics event contract', () => {
  it.each(validEvents)('accepts the declared $name event', (event) => {
    expect(validateAnalyticsEvent(event)).toEqual(event)
  })

  it.each([
    { data: {}, name: 'unknown_event' },
    {
      data: { cta: 'check_readiness', email: 'visitor@example.com', placement: 'home_hero' },
      name: 'primary_cta_clicked',
    },
    {
      data: { placement: 'home', prototype: 'Back Then', status: 'prototype' },
      name: 'prototype_card_clicked',
    },
    {
      data: { placement: 'home', prototype: 'visitor@example.com', status: 'prototype' },
      name: 'prototype_card_clicked',
    },
    {
      data: { placement: 'home', prototype: 'back-then', status: 'production' },
      name: 'prototype_card_clicked',
    },
    {
      data: { entry: 'home_preview', mode: 'custom' },
      name: 'readiness_started',
    },
    {
      data: { prototype: 'a' + '-slug'.repeat(20) },
      name: 'prototype_source_clicked',
    },
    {
      data: { note: 'harness-from-scratch', placement: 'detail' },
      name: 'build_note_card_clicked',
    },
    {
      data: { note: 'Harness From Scratch' },
      name: 'build_note_view',
    },
    {
      data: { note: 'unpublished-note' },
      name: 'build_note_view',
    },
  ])('rejects undeclared or high-cardinality input: $name', (event) => {
    expect(validateAnalyticsEvent(event)).toBeNull()
  })

  it('sends one canonical call when the tracker is available', () => {
    const track = vi.fn()
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { umami: { track } },
    })

    expect(trackAnalyticsEvent(validEvents[2])).toBe(true)
    expect(track).toHaveBeenCalledOnce()
    expect(track).toHaveBeenCalledWith('prototype_card_clicked', {
      placement: 'home',
      prototype: 'back-then',
      status: 'prototype',
    })
  })

  it('fails open for the product when analytics is absent, invalid, or throws', () => {
    expect(trackAnalyticsEvent(validEvents[0])).toBe(false)

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        umami: {
          track: vi.fn(() => {
            throw new Error('blocked')
          }),
        },
      },
    })

    expect(trackAnalyticsEvent(validEvents[0])).toBe(false)
    expect(trackAnalyticsEvent({ data: { email: 'visitor@example.com' }, name: 'contact' })).toBe(
      false,
    )
  })
})
