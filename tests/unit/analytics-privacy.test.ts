import { afterEach, describe, expect, it, vi } from 'vitest'

import { guardUmamiPayload } from '@/lib/analytics/privacy'
import { buildNotes } from '@/lib/build-notes'

const pageview = {
  hostname: 'saberistic.com',
  language: 'en-US',
  referrer: 'https://www.google.com/search?q=private+query#result',
  screen: '1440x900',
  title: 'Saberistic — Prototype to Production',
  url: '/readiness?profile=payments#evidence',
  website: '94db1cb1-74f4-4a40-ad6c-962362670409',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Umami before-send privacy guard', () => {
  it('keeps a normal pageview while removing query, hash, and referrer paths', () => {
    expect(guardUmamiPayload('event', pageview)).toEqual({
      ...pageview,
      referrer: 'https://www.google.com',
      url: '/readiness',
    })
  })

  it('passes only canonical custom event data', () => {
    expect(
      guardUmamiPayload('event', {
        ...pageview,
        data: { placement: 'detail', prototype: 'story-sprout-pay' },
        name: 'prototype_launch',
        url: '/prototypes/story-sprout-pay?campaign=private',
      }),
    ).toMatchObject({
      data: { placement: 'detail', prototype: 'story-sprout-pay' },
      name: 'prototype_launch',
      url: '/prototypes/story-sprout-pay',
    })
  })

  it('drops arbitrary top-level fields instead of forwarding them', () => {
    const result = guardUmamiPayload('event', {
      ...pageview,
      campaignNote: 'arbitrary visitor-supplied text',
      data: { service: 'engineering_rescue' },
      name: 'service_viewed',
    })

    expect(result).toMatchObject({
      data: { service: 'engineering_rescue' },
      name: 'service_viewed',
    })
    expect(result).not.toHaveProperty('campaignNote')
  })

  it('allows the public privacy notice to explain the active collection', () => {
    expect(
      guardUmamiPayload('event', { ...pageview, url: '/privacy?source=footer' }),
    ).toMatchObject({
      url: '/privacy',
    })
  })

  it('normalizes static trailing slashes and allows bounded build-note events', () => {
    for (const note of buildNotes) {
      expect(
        guardUmamiPayload('event', {
          ...pageview,
          data: { note: note.slug },
          name: 'build_note_view',
          url: `/build-notes/${note.slug}/?source=home#section`,
        }),
      ).toMatchObject({
        data: { note: note.slug },
        name: 'build_note_view',
        url: `/build-notes/${note.slug}`,
      })
    }

    expect(
      guardUmamiPayload('event', { ...pageview, url: '/prototypes/back-then/' }),
    ).toMatchObject({ url: '/prototypes/back-then' })
  })

  it.each([
    ['unexpected type', 'identify', pageview],
    ['unapproved hostname', 'event', { ...pageview, hostname: 'preview.onrender.com' }],
    ['unapproved absolute URL', 'event', { ...pageview, url: 'https://evil.example/readiness' }],
    ['private route', 'event', { ...pageview, url: '/admin/collections/users' }],
    ['near-prefix route', 'event', { ...pageview, url: '/readiness/private' }],
    ['unknown build note path', 'event', { ...pageview, url: '/build-notes/private/draft' }],
    ['unpublished build note', 'event', { ...pageview, url: '/build-notes/unpublished-note/' }],
    ['email in the title', 'event', { ...pageview, title: 'Report for visitor@example.com' }],
    [
      'unknown custom event',
      'event',
      { ...pageview, data: { email: 'visitor@example.com' }, name: 'form_submitted' },
    ],
    [
      'extra event field',
      'event',
      {
        ...pageview,
        data: { placement: 'detail', prototype: 'back-then', query: 'private words' },
        name: 'prototype_launch',
      },
    ],
  ])('cancels %s', (_label, type, payload) => {
    expect(guardUmamiPayload(type, payload)).toBe(false)
  })

  it('allows bounded performance data without widening the event contract', () => {
    expect(
      guardUmamiPayload('performance', {
        ...pageview,
        cls: 0.02,
        duration: 3200,
        lcp: 1200,
        url: '/',
      }),
    ).toMatchObject({ cls: 0.02, duration: 3200, lcp: 1200, url: '/' })

    expect(
      guardUmamiPayload('performance', {
        ...pageview,
        duration: 'visitor@example.com',
        url: '/',
      }),
    ).toBe(false)
  })

  it('records an honest zero CLS when a supported browser omits the zero-value field', () => {
    vi.stubGlobal('PerformanceObserver', {
      supportedEntryTypes: ['layout-shift'],
    })

    expect(
      guardUmamiPayload('performance', {
        ...pageview,
        duration: 3200,
        lcp: 1200,
        url: '/',
      }),
    ).toMatchObject({ cls: 0, duration: 3200, lcp: 1200 })
  })

  it('leaves missing CLS unknown when the browser does not report layout-shift support', () => {
    vi.stubGlobal('PerformanceObserver', {
      supportedEntryTypes: ['largest-contentful-paint'],
    })

    const result = guardUmamiPayload('performance', {
      ...pageview,
      duration: 3200,
      lcp: 1200,
      url: '/',
    })

    expect(result).not.toBe(false)
    expect(result).not.toHaveProperty('cls')
  })

  it('does not mutate the tracker payload supplied by Umami', () => {
    const original = structuredClone(pageview)
    guardUmamiPayload('event', pageview)
    expect(pageview).toEqual(original)
  })
})
