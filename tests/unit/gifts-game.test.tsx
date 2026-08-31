// @vitest-environment jsdom

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GiftDiscoveryGame } from '@/components/gifts/GiftDiscoveryGame'
import type { GiftRecommendationResponse } from '@/lib/gifts'

function recommendationDeck(): GiftRecommendationResponse {
  return {
    disclaimer:
      'Prices are recent observations. The Stripe amount is a fixed gift contribution to Saberistic.',
    ideas: Array.from({ length: 9 }, (_, index) => ({
      category: `Category ${index + 1}`,
      checkedAt: '2026-08-31T15:30:00.000Z',
      currency: 'usd' as const,
      id: `offer_${String(index + 1).padStart(8, '0')}`,
      name: `Thoughtful physical gift ${index + 1}`,
      observedPriceCents: 1_500 + index * 100,
      quoteToken: `gq1.${'a'.repeat(40 + index)}.${'b'.repeat(43)}`,
      retailer: `Retailer ${index + 1}`,
      sourceUrl: `https://retailer${index + 1}.example/products/gift-${index + 1}`,
      whyItFits: `A useful and durable choice for a design-conscious systems builder number ${index + 1}.`,
    })),
    runId: 'run_1234567890123456',
    searchedAt: '2026-08-31T15:30:00.000Z',
  }
}

beforeEach(() => {
  window.localStorage.clear()
  window.history.replaceState({}, '', '/gifts')
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(performance.now()), 0),
  )
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => window.clearTimeout(handle))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Gift Draft game', () => {
  it('reports a successful return only after the server verifies Stripe', async () => {
    window.history.replaceState(
      {},
      '',
      '/gifts?checkout=success&session_id=cs_test_1234567890123456',
    )
    const fetchMock = vi.fn(async () => Response.json({ paymentStatus: 'paid' }))
    vi.stubGlobal('fetch', fetchMock)

    const view = render(<GiftDiscoveryGame />)

    expect(await view.findByRole('heading', { name: 'The gift contribution is in.' })).toBeTruthy()
    expect(view.getByText('PAYMENT CONFIRMED')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledOnce()

    const [endpoint, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const statusURL = new URL(endpoint)
    expect(statusURL.pathname).toBe('/api/gifts/payment-status')
    expect(statusURL.searchParams.get('session_id')).toBe('cs_test_1234567890123456')
    expect(init.method).toBe('GET')
  })

  it('does not trust a success query without exactly one valid Stripe Session ID', async () => {
    window.history.replaceState({}, '', '/gifts?checkout=success')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const view = render(<GiftDiscoveryGame />)

    expect(
      await view.findByRole('heading', { name: 'The Stripe return needs another check.' }),
    ).toBeTruthy()
    expect(view.getByText('STATUS NOT VERIFIED')).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('can retry a transient payment-status verification failure', async () => {
    window.history.replaceState(
      {},
      '',
      '/gifts?checkout=success&session_id=cs_test_1234567890123456',
    )
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ error: 'temporarily unavailable' }, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ paymentStatus: 'paid' }))
    vi.stubGlobal('fetch', fetchMock)

    const view = render(<GiftDiscoveryGame />)

    await view.findByRole('heading', { name: 'The Stripe return needs another check.' })
    fireEvent.click(view.getByRole('button', { name: 'Check Stripe again' }))

    expect(await view.findByRole('heading', { name: 'The gift contribution is in.' })).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('deals three rounds and requires contribution acknowledgment before checkout', async () => {
    const fetchMock = vi.fn(async () => Response.json(recommendationDeck()))
    vi.stubGlobal('fetch', fetchMock)
    const view = render(<GiftDiscoveryGame />)

    await waitFor(() => {
      expect(view.getByRole('heading', { name: 'Choose the shape of the surprise.' })).toBeTruthy()
    })
    fireEvent.click(view.getByRole('radio', { name: /Under \$30/ }))
    fireEvent.click(view.getByRole('radio', { name: /Build fuel/ }))

    const dealButton = view.getByRole('button', { name: 'Deal the first round' })
    expect((dealButton as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(dealButton)

    expect(
      await view.findByRole('heading', { name: 'Keep one. The other two leave the deck.' }),
    ).toBeTruthy()

    for (let round = 0; round < 3; round += 1) {
      const keepButtons = await view.findAllByRole('button', { name: 'Keep this one' })
      expect(keepButtons).toHaveLength(3)
      fireEvent.click(keepButtons[0]!)
    }

    expect(
      await view.findByRole('heading', { name: 'One gift gets the checkout button.' }),
    ).toBeTruthy()
    fireEvent.click(view.getAllByRole('button', { name: 'Choose this finalist' })[0]!)

    expect(
      view.getByRole('heading', {
        name: 'You are sending a fixed gift contribution—not placing a retailer order.',
      }),
    ).toBeTruthy()
    const checkout = view.getByRole('button', { name: 'Open Stripe Checkout — $15.00' })
    expect((checkout as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(
      view.getByRole('checkbox', {
        name: /I understand this is a fixed gift contribution to Saberistic/,
      }),
    )
    expect((checkout as HTMLButtonElement).disabled).toBe(false)

    expect(fetchMock).toHaveBeenCalledOnce()
    const [endpoint, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(endpoint).toBe('/api/gifts/ideas')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toMatchObject({
      budget: 'under_30',
      theme: 'build_fuel',
    })
  })
})
