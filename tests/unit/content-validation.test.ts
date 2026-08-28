import { describe, expect, it } from 'vitest'

import {
  normalizeSlug,
  validateCanonicalOrigin,
  validateHttpUrl,
  validateSlug,
} from '../../src/lib/validation/content'

const expectInvalid = (result: true | string): void => {
  expect(typeof result).toBe('string')
  expect(result).not.toBe('')
}

describe('slug validation', () => {
  it('accepts canonical lowercase slugs', () => {
    expect(validateSlug('story-sprout-pay')).toBe(true)
    expect(validateSlug('prototype-2')).toBe(true)
  })

  it.each([
    '',
    'Story-Sprout-Pay',
    'story sprout pay',
    'story_sprout_pay',
    '-story-sprout-pay',
    'story-sprout-pay-',
  ])('rejects a non-canonical slug: %j', (value) => {
    expectInvalid(validateSlug(value))
  })

  it('normalizes human-entered text without weakening validation', () => {
    expect(normalizeSlug('  Story Sprout Pay  ')).toBe('story-sprout-pay')
    expect(validateSlug('  Story Sprout Pay  ')).not.toBe(true)
  })
})

describe('public URL validation', () => {
  it('allows an omitted optional URL and valid HTTPS URLs', () => {
    expect(validateHttpUrl(undefined)).toBe(true)
    expect(validateHttpUrl('')).toBe(true)
    expect(validateHttpUrl('https://example.com/path?preview=1')).toBe(true)
  })

  it.each([
    'http://localhost:3000/preview',
    'http://127.0.0.1:3000/preview',
    'http://[::1]:3000/preview',
  ])('allows HTTP only for a loopback development host: %s', (value) => {
    expect(validateHttpUrl(value)).toBe(true)
  })

  it.each([
    'http://example.com',
    'ftp://example.com/file',
    'javascript:alert(1)',
    '/relative/path',
    'not a url',
    'https://user:password@example.com',
  ])('rejects an unsafe or non-public URL: %s', (value) => {
    expectInvalid(validateHttpUrl(value))
  })
})

describe('canonical origin validation', () => {
  it('accepts a root HTTPS origin', () => {
    expect(validateCanonicalOrigin('https://example.com')).toBe(true)
    expect(validateCanonicalOrigin('https://example.com/')).toBe(true)
  })

  it.each([
    'https://example.com/path',
    'https://example.com/?preview=1',
    'https://example.com/#section',
    'https://user:password@example.com',
  ])('rejects values that are not a bare canonical origin: %s', (value) => {
    expectInvalid(validateCanonicalOrigin(value))
  })
})
