// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GiftDiscoveryGame } from '@/components/gifts/GiftDiscoveryGame'
import type { GiftRecommendationResponse } from '@/lib/gifts'

function recommendationDeck(): GiftRecommendationResponse {
  return {
    disclaimer:
      'Images, retailer links, prices, and availability are cached references that may change. The Stripe amount is a fixed gift contribution to Saberistic.',
    ideas: Array.from({ length: 9 }, (_, index) => ({
      artworkUrl: `/api/gifts/artwork/offer_${String(index + 1).padStart(8, '0')}`,
      category: `Category ${index + 1}`,
      checkedAt: '2026-08-31T15:30:00.000Z',
      currency: 'usd' as const,
      id: `offer_${String(index + 1).padStart(8, '0')}`,
      name: `Thoughtful physical gift ${index + 1}`,
      observedPriceCents: 1_500 + index * 100,
      productDescription: `A retailer-sourced description for thoughtful physical gift ${index + 1}.`,
      quoteToken: `gq1.${'a'.repeat(40 + index)}.${'b'.repeat(43)}`,
      retailer: `Retailer ${index + 1}`,
      sourceUrl: `https://www.adafruit.com/products/gift-${index + 1}`,
      whyItFits: `A useful and durable choice for a design-conscious systems builder number ${index + 1}.`,
    })),
    runId: 'run_1234567890123456',
    searchedAt: '2026-08-31T15:30:00.000Z',
  }
}

function availabilityResponse(
  overrides: Partial<{
    checkoutEnabled: boolean
    ideasEnabled: boolean
    inventoryStatus: 'paused' | 'ready' | 'restocking'
  }> = {},
) {
  return Response.json({
    checkoutEnabled: true,
    ideasEnabled: true,
    inventoryStatus: 'ready',
    ...overrides,
  })
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
    const fetchMock = vi.fn(async (input: string | URL | Request) =>
      new URL(String(input), window.location.origin).pathname === '/api/gifts/ideas'
        ? availabilityResponse()
        : Response.json({ paymentStatus: 'paid' }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const view = render(<GiftDiscoveryGame />)

    expect(await view.findByRole('heading', { name: 'The gift contribution is in.' })).toBeTruthy()
    expect(view.getByText('PAYMENT CONFIRMED')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const statusCall = fetchMock.mock.calls.find(([endpoint]) =>
      String(endpoint).includes('/api/gifts/payment-status'),
    )
    const [endpoint, init] = statusCall as unknown as [string, RequestInit]
    const statusURL = new URL(endpoint)
    expect(statusURL.pathname).toBe('/api/gifts/payment-status')
    expect(statusURL.searchParams.get('session_id')).toBe('cs_test_1234567890123456')
    expect(init.method).toBe('GET')
  })

  it('does not trust a success query without exactly one valid Stripe Session ID', async () => {
    window.history.replaceState({}, '', '/gifts?checkout=success')
    const fetchMock = vi.fn(async () => availabilityResponse())
    vi.stubGlobal('fetch', fetchMock)

    const view = render(<GiftDiscoveryGame />)

    expect(
      await view.findByRole('heading', { name: 'The Stripe return needs another check.' }),
    ).toBeTruthy()
    expect(view.getByText('STATUS NOT VERIFIED')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('can retry a transient payment-status verification failure', async () => {
    window.history.replaceState(
      {},
      '',
      '/gifts?checkout=success&session_id=cs_test_1234567890123456',
    )
    let paymentStatusCalls = 0
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (new URL(String(input), window.location.origin).pathname === '/api/gifts/ideas') {
        return availabilityResponse()
      }
      paymentStatusCalls += 1
      return paymentStatusCalls === 1
        ? Response.json({ error: 'temporarily unavailable' }, { status: 503 })
        : Response.json({ paymentStatus: 'paid' })
    })
    vi.stubGlobal('fetch', fetchMock)

    const view = render(<GiftDiscoveryGame />)

    await view.findByRole('heading', { name: 'The Stripe return needs another check.' })
    fireEvent.click(view.getByRole('button', { name: 'Check Stripe again' }))

    expect(await view.findByRole('heading', { name: 'The gift contribution is in.' })).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('deals from ready cache while discovery and validation refresh future games', async () => {
    let finishDeck: (response: Response) => void = () => undefined
    const pendingDeck = new Promise<Response>((resolve) => {
      finishDeck = resolve
    })
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) =>
      init?.method === 'GET' ? availabilityResponse() : pendingDeck,
    )
    vi.stubGlobal('fetch', fetchMock)
    const view = render(<GiftDiscoveryGame />)

    fireEvent.click(await view.findByRole('radio', { name: /Under \$30/ }))
    fireEvent.click(view.getByRole('radio', { name: /Build fuel/ }))
    fireEvent.click(view.getByRole('button', { name: 'Deal the first round' }))

    expect(
      await view.findByRole('heading', { name: 'Assembling your cached product deck…' }),
    ).toBeTruthy()
    expect(view.getByText(/discovery and validation refresh future games/i)).toBeTruthy()

    await act(async () => {
      finishDeck(Response.json(recommendationDeck()))
    })
    expect(
      await view.findByRole('heading', { name: 'Keep one. The other two leave the deck.' }),
    ).toBeTruthy()
  })

  it('deals three rounds with cached product images and requires contribution acknowledgment', async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) =>
      init?.method === 'GET' ? availabilityResponse() : Response.json(recommendationDeck()),
    )
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
    expect(view.getAllByRole('img', { name: /product image/ })).toHaveLength(3)
    expect(view.getAllByText('Cached product image')).toHaveLength(3)
    expect(view.getAllByText(/Approx\. cached price/)).toHaveLength(3)
    expect(view.getAllByText(/retailer-sourced description/i)).toHaveLength(3)
    expect(view.getAllByText(/last checked/i)).toHaveLength(3)
    expect(view.getAllByRole('link', { name: /View .+ at Retailer .+/ })).toHaveLength(3)
    expect(view.getByText(/cached, validated inventory/i)).toBeTruthy()

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
    expect(view.getByText(/retailer link, cached price, and availability may change/i)).toBeTruthy()
    expect(view.getAllByText(/a substitute, or any other gift/i).length).toBeGreaterThan(0)
    const checkout = view.getByRole('button', { name: 'Open Stripe Checkout — $15.00' })
    expect((checkout as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(
      view.getByRole('checkbox', {
        name: /I understand this is a fixed gift contribution to Saberistic, not a purchase/,
      }),
    )
    expect((checkout as HTMLButtonElement).disabled).toBe(false)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const ideasCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    const [endpoint, init] = ideasCall as unknown as [string, RequestInit]
    expect(endpoint).toBe('/api/gifts/ideas')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toMatchObject({
      budget: 'under_30',
      theme: 'build_fuel',
    })
  })

  it('shows an honest paused state without offering a dead draw', async () => {
    const fetchMock = vi.fn(async () =>
      availabilityResponse({
        checkoutEnabled: false,
        ideasEnabled: false,
        inventoryStatus: 'paused',
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const view = render(<GiftDiscoveryGame />)

    fireEvent.click(await view.findByRole('radio', { name: /Under \$30/ }))
    fireEvent.click(view.getByRole('radio', { name: /Build fuel/ }))

    expect(view.getByText(/cached product inventory is paused right now/i)).toBeTruthy()
    expect(
      (view.getByRole('button', { name: 'Product inventory is paused' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('shows background restocking separately from a paused feature', async () => {
    const fetchMock = vi.fn(async () =>
      availabilityResponse({
        checkoutEnabled: false,
        ideasEnabled: false,
        inventoryStatus: 'restocking',
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const view = render(<GiftDiscoveryGame />)

    expect(await view.findByText(/real products are being checked and cached now/i)).toBeTruthy()
    expect(
      (view.getByRole('button', { name: 'Restocking real products…' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    expect(view.queryByText(/inventory is paused right now/i)).toBeNull()
  })

  it('retries a failed availability check before enabling a live draw', async () => {
    let availabilityCalls = 0
    const fetchMock = vi.fn(async () => {
      availabilityCalls += 1
      return availabilityCalls === 1
        ? Response.json({ error: 'temporarily unavailable' }, { status: 503 })
        : availabilityResponse()
    })
    vi.stubGlobal('fetch', fetchMock)
    const view = render(<GiftDiscoveryGame />)

    expect(await view.findByText(/could not check the live Gift Draft status/i)).toBeTruthy()
    fireEvent.click(view.getByRole('button', { name: 'Try status again' }))

    await waitFor(() => {
      expect(view.getByText(/instant from cached inventory/i)).toBeTruthy()
    })
    fireEvent.click(view.getByRole('radio', { name: /Under \$30/ }))
    fireEvent.click(view.getByRole('radio', { name: /Build fuel/ }))

    expect(
      (view.getByRole('button', { name: 'Deal the first round' }) as HTMLButtonElement).disabled,
    ).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('keeps a restored draft reviewable while both checkout and new draws are paused', async () => {
    const response = recommendationDeck()
    const picks = [response.ideas[0]!.id, response.ideas[3]!.id, response.ideas[6]!.id]
    window.localStorage.setItem(
      'saberistic:gift-draft:v1',
      JSON.stringify({
        budget: 'under_30',
        completed: true,
        finalId: picks[0],
        picks,
        response,
        theme: 'build_fuel',
        version: 1,
      }),
    )
    const fetchMock = vi.fn(async () =>
      availabilityResponse({
        checkoutEnabled: false,
        ideasEnabled: false,
        inventoryStatus: 'paused',
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const view = render(<GiftDiscoveryGame />)

    expect(
      await view.findByRole('heading', { name: 'One gift gets the checkout button.' }),
    ).toBeTruthy()
    expect(view.getByText('Gift contribution checkout is currently paused.')).toBeTruthy()
    expect(view.queryByRole('button', { name: /Open Stripe Checkout/ })).toBeNull()

    const pausedDeckAction = view.getByRole('button', { name: /paused/i })
    expect((pausedDeckAction as HTMLButtonElement).disabled).toBe(true)
    expect(view.queryByRole('button', { name: 'Deal a new deck' })).toBeNull()
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
