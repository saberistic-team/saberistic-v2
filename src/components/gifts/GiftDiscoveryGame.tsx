'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

import {
  giftBudgets,
  giftPaymentStatuses,
  giftRecipientProfile,
  giftThemes,
  isGiftRecommendationResponse,
  validateGiftRecommendationRequest,
  type GiftBudgetId,
  type GiftCheckoutResponse,
  type GiftIdea,
  type GiftPaymentStatus,
  type GiftRecommendationResponse,
  type GiftThemeId,
} from '@/lib/gifts'

export type GiftDiscoveryGameProps = {
  checkoutEndpoint?: string
  ideasEndpoint?: string
  paymentStatusEndpoint?: string
}

type CheckoutReturn = 'canceled' | 'success' | null
type GiftAvailability = {
  checkoutEnabled: boolean
  ideasEnabled: boolean
  inventoryStatus: 'paused' | 'ready' | 'restocking'
}
type PaymentVerification = 'checking' | 'unverified' | GiftPaymentStatus | null
type FocusTarget = 'checkout' | 'final' | 'round' | 'setup'

type StoredGiftDraft = {
  budget: GiftBudgetId
  completed: boolean
  finalId: string | null
  picks: string[]
  response: GiftRecommendationResponse
  theme: GiftThemeId
  version: 1
}

const storageKey = 'saberistic:gift-draft:v1'
const anonymousTokenKey = 'saberistic:gift-draft:anonymous-token:v1'
const safeTokenPattern = /^[A-Za-z0-9_-]{16,160}$/
const maximumRecommendationBytes = 256 * 1024
const maximumCheckoutBytes = 32 * 1024
const availabilityRequestTimeoutMs = 45_000
const paymentRequestTimeoutMs = 45_000

const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  style: 'currency',
})

const generatedAtFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  month: 'short',
  timeZone: 'UTC',
  timeZoneName: 'short',
  year: 'numeric',
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isBudgetId(value: unknown): value is GiftBudgetId {
  return giftBudgets.some((budget) => budget.id === value)
}

function isThemeId(value: unknown): value is GiftThemeId {
  return giftThemes.some((theme) => theme.id === value)
}

function randomToken() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  const bytes = new Uint8Array(24)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes)
    return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
  }

  return `gift_${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random()
    .toString(36)
    .slice(2)}`
}

function anonymousToken() {
  try {
    const saved = window.localStorage.getItem(anonymousTokenKey)
    if (saved && safeTokenPattern.test(saved)) return saved

    const created = randomToken()
    window.localStorage.setItem(anonymousTokenKey, created)
    return created
  } catch {
    return randomToken()
  }
}

function formatPrice(cents: number) {
  return currencyFormatter.format(cents / 100)
}

function formatGeneratedAt(value: string) {
  return generatedAtFormatter.format(new Date(value))
}

async function readJSON(response: Response, maximumBytes: number): Promise<unknown> {
  const declaredLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new Error('oversized_response')
  }

  const body = await response.text()
  if (body.length > maximumBytes) throw new Error('oversized_response')

  try {
    return JSON.parse(body) as unknown
  } catch {
    throw new Error('invalid_response')
  }
}

function safeAPIMessage(value: unknown, fallback: string) {
  if (
    isRecord(value) &&
    typeof value.error === 'string' &&
    value.error.length > 0 &&
    value.error.length <= 300
  ) {
    return value.error
  }

  return fallback
}

function safeStripeCheckoutURL(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2_000) return null

  try {
    const url = new URL(value)
    if (
      url.protocol !== 'https:' ||
      url.hostname.toLowerCase() !== 'checkout.stripe.com' ||
      url.username ||
      url.password ||
      (url.port && url.port !== '443')
    ) {
      return null
    }

    return url.toString()
  } catch {
    return null
  }
}

function isGiftCheckoutResponse(value: unknown): value is GiftCheckoutResponse {
  return (
    isRecord(value) &&
    Object.keys(value).length === 1 &&
    safeStripeCheckoutURL(value.checkoutUrl) !== null
  )
}

function isGiftPaymentStatusResponse(
  value: unknown,
): value is { paymentStatus: GiftPaymentStatus } {
  return (
    isRecord(value) &&
    Object.keys(value).length === 1 &&
    typeof value.paymentStatus === 'string' &&
    giftPaymentStatuses.some((status) => status === value.paymentStatus)
  )
}

function isGiftAvailability(value: unknown): value is GiftAvailability {
  return (
    isRecord(value) &&
    Object.keys(value).length === 3 &&
    typeof value.checkoutEnabled === 'boolean' &&
    typeof value.ideasEnabled === 'boolean' &&
    ['paused', 'ready', 'restocking'].includes(String(value.inventoryStatus))
  )
}

function paymentReturnCopy(status: PaymentVerification) {
  switch (status) {
    case 'checking':
      return {
        body: 'This page is checking Stripe before it reports a payment result. The selected concept is inspiration; Saberistic does not sell, order, or ship the depicted item.',
        eyebrow: 'VERIFYING WITH STRIPE',
        title: 'Checking the gift contribution…',
      }
    case 'paid':
      return {
        body: 'Stripe confirmed the gift contribution. The pictured concept is inspiration, and AmirSaber may use the contribution toward any gift. No item was ordered or shipped automatically.',
        eyebrow: 'PAYMENT CONFIRMED',
        title: 'The gift contribution is in.',
      }
    case 'pending':
      return {
        body: 'Stripe has not confirmed the funds yet. No item is sold, ordered, or shipped while the contribution is pending.',
        eyebrow: 'PAYMENT PENDING',
        title: 'Stripe is still processing this contribution.',
      }
    case 'partially_refunded':
      return {
        body: 'Stripe and the private fulfillment record show that part of this contribution was refunded.',
        eyebrow: 'PARTIAL REFUND RECORDED',
        title: 'This contribution was partially refunded.',
      }
    case 'refunded':
      return {
        body: 'Stripe and the private fulfillment record show that this contribution was refunded.',
        eyebrow: 'REFUND RECORDED',
        title: 'This contribution was refunded.',
      }
    case 'failed':
      return {
        body: 'Stripe did not confirm the funds, so no gift contribution was completed and no item was ordered or shipped.',
        eyebrow: 'PAYMENT NOT CONFIRMED',
        title: 'The contribution did not complete.',
      }
    case 'expired':
      return {
        body: 'The Stripe Checkout Session expired without a confirmed contribution. Deal a new deck to try again.',
        eyebrow: 'CHECKOUT EXPIRED',
        title: 'This checkout is no longer active.',
      }
    default:
      return {
        body: 'This browser could not verify a Stripe payment. No item is sold, ordered, or shipped automatically; try checking the status again.',
        eyebrow: 'STATUS NOT VERIFIED',
        title: 'The Stripe return needs another check.',
      }
  }
}

function readStoredDraft(): StoredGiftDraft | null {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw || raw.length > maximumRecommendationBytes) return null

    const value = JSON.parse(raw) as unknown
    if (
      !isRecord(value) ||
      value.version !== 1 ||
      !isBudgetId(value.budget) ||
      !isThemeId(value.theme) ||
      !isGiftRecommendationResponse(value.response) ||
      !Array.isArray(value.picks)
    ) {
      return null
    }

    const picks: string[] = []
    for (const [roundIndex, pick] of value.picks.slice(0, 3).entries()) {
      if (
        typeof pick !== 'string' ||
        !value.response.ideas
          .slice(roundIndex * 3, roundIndex * 3 + 3)
          .some((idea) => idea.id === pick)
      ) {
        break
      }
      picks.push(pick)
    }

    const finalId =
      picks.length === 3 && typeof value.finalId === 'string' && picks.includes(value.finalId)
        ? value.finalId
        : null

    return {
      budget: value.budget,
      completed: value.completed === true && finalId !== null,
      finalId,
      picks,
      response: value.response,
      theme: value.theme,
      version: 1,
    }
  } catch {
    return null
  }
}

function GiftProgress({ picks }: { picks: string[] }) {
  const activeIndex = Math.min(picks.length, 3)
  const steps = ['Round 1', 'Round 2', 'Round 3', 'Final']

  return (
    <ol aria-label="Gift Draft progress" className="gift-progress">
      {steps.map((step, index) => (
        <li
          aria-current={activeIndex === index ? 'step' : undefined}
          className={
            index < activeIndex
              ? 'gift-progress__step gift-progress__step--done'
              : 'gift-progress__step'
          }
          key={step}
        >
          <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <strong>{step}</strong>
        </li>
      ))}
    </ol>
  )
}

function GiftIdeaCard({
  actionLabel,
  displayIndex,
  idPrefix,
  idea,
  onSelect,
  selected = false,
}: {
  actionLabel: string
  displayIndex: number
  idPrefix: string
  idea: GiftIdea
  onSelect: () => void
  selected?: boolean
}) {
  const titleId = `${idPrefix}-title`
  const detailId = `${idPrefix}-detail`

  return (
    <article className={selected ? 'gift-card gift-card--selected' : 'gift-card'}>
      <figure className="gift-card__product-image">
        <Image
          alt={`AI-generated concept artwork: ${idea.artworkAlt}`}
          fill
          sizes="(max-width: 52rem) 100vw, 33vw"
          src={idea.artworkUrl}
        />
        <figcaption>AI-generated concept artwork · cached by Saberistic</figcaption>
      </figure>
      <div className="gift-card__meta">
        <span>{String(displayIndex).padStart(2, '0')}</span>
        <span className="status">{idea.category}</span>
      </div>
      <h3 id={titleId}>{idea.name}</h3>
      <p className="gift-card__reason">{idea.whyItFits}</p>
      <p className="gift-card__description">{idea.conceptDescription}</p>
      <div className="gift-card__price" id={detailId}>
        <strong>Suggested gift contribution {formatPrice(idea.suggestedContributionCents)}</strong>
        <span>AI-created concept · generated {formatGeneratedAt(idea.generatedAt)}</span>
      </div>
      <div className="gift-card__actions">
        <button
          aria-describedby={`${titleId} ${detailId}`}
          aria-pressed={actionLabel === 'Keep this one' ? undefined : selected}
          className={selected ? 'button button--quiet' : 'button'}
          onClick={onSelect}
          type="button"
        >
          {selected ? 'Selected for contribution' : actionLabel}
        </button>
      </div>
    </article>
  )
}

function GiftSetup({
  availability,
  availabilityCheckFailed,
  budget,
  onAvailabilityRetry,
  onBudgetChange,
  onDeal,
  onThemeChange,
  setupHeading,
  theme,
}: {
  availability: GiftAvailability | null
  availabilityCheckFailed: boolean
  budget: GiftBudgetId | null
  onAvailabilityRetry: () => void
  onBudgetChange: (budget: GiftBudgetId) => void
  onDeal: () => void
  onThemeChange: (theme: GiftThemeId) => void
  setupHeading: React.RefObject<HTMLHeadingElement | null>
  theme: GiftThemeId | null
}) {
  return (
    <div className="gift-setup">
      <div className="gift-stage-heading">
        <p className="eyebrow">01 / SET THE DECK</p>
        <h2 id="gift-setup-heading" ref={setupHeading} tabIndex={-1}>
          Choose the shape of the surprise.
        </h2>
        <p>
          Pick a contribution range and a theme. Each quick round draws three AI-created gift
          concepts from ready inventory while background generation creates future games.
        </p>
      </div>

      <fieldset className="gift-choice-group">
        <legend>What should the gift amount be?</legend>
        <div className="gift-choice-grid gift-choice-grid--budget">
          {giftBudgets.map((option) => (
            <label key={option.id}>
              <input
                checked={budget === option.id}
                name="gift-budget"
                onChange={() => onBudgetChange(option.id)}
                type="radio"
                value={option.id}
              />
              <span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="gift-choice-group">
        <legend>What kind of gift should appear?</legend>
        <div className="gift-choice-grid gift-choice-grid--theme">
          {giftThemes.map((option) => (
            <label key={option.id}>
              <input
                checked={theme === option.id}
                name="gift-theme"
                onChange={() => onThemeChange(option.id)}
                type="radio"
                value={option.id}
              />
              <span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="gift-game__actions">
        <p role="status">
          {availabilityCheckFailed
            ? 'The page could not check the live Gift Draft status. No draw will start until that check succeeds.'
            : availability === null
              ? 'Checking whether the cached concept inventory is ready…'
              : availability.ideasEnabled
                ? 'Each deal is instant from cached concepts; background generation creates later games.'
                : availability.inventoryStatus === 'restocking'
                  ? 'New AI gift concepts and artwork are being generated now. This page will retry automatically.'
                  : 'The cached gift-concept inventory is paused right now. Try again later.'}
        </p>
        <button
          className="button"
          disabled={
            !availabilityCheckFailed && (!budget || !theme || availability?.ideasEnabled !== true)
          }
          onClick={availabilityCheckFailed ? onAvailabilityRetry : onDeal}
          type="button"
        >
          {availabilityCheckFailed
            ? 'Try status again'
            : availability === null
              ? 'Checking inventory…'
              : availability.ideasEnabled
                ? 'Deal the first round'
                : availability.inventoryStatus === 'restocking'
                  ? 'Generating new concepts…'
                  : 'Gift-concept inventory is paused'}
        </button>
      </div>
    </div>
  )
}

function GiftLoading({ message }: { message: string }) {
  return (
    <div aria-live="polite" className="gift-loading" role="status">
      <p className="eyebrow">DEALING FROM CACHED CONCEPTS</p>
      <h2>{message}</h2>
      <p>Ready concepts keep this draw quick while background generation creates future games.</p>
      <div aria-hidden="true" className="gift-loading__cards">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}

export function GiftDiscoveryGame({
  checkoutEndpoint = '/api/gifts/checkout',
  ideasEndpoint = '/api/gifts/ideas',
  paymentStatusEndpoint = '/api/gifts/payment-status',
}: GiftDiscoveryGameProps) {
  const [availability, setAvailability] = useState<GiftAvailability | null>(null)
  const [availabilityCheckFailed, setAvailabilityCheckFailed] = useState(false)
  const [availabilityCheckTick, setAvailabilityCheckTick] = useState(0)
  const [budget, setBudget] = useState<GiftBudgetId | null>(null)
  const [checkoutReturn, setCheckoutReturn] = useState<CheckoutReturn>(null)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [finalId, setFinalId] = useState<string | null>(null)
  const [focusTick, setFocusTick] = useState(0)
  const [hasRestored, setHasRestored] = useState(false)
  const [hasAcknowledgedContribution, setHasAcknowledgedContribution] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [liveMessage, setLiveMessage] = useState('')
  const [loadingMessage, setLoadingMessage] = useState('Assembling your cached concept deck…')
  const [picks, setPicks] = useState<string[]>([])
  const [paymentVerification, setPaymentVerification] = useState<PaymentVerification>(null)
  const [paymentVerificationTick, setPaymentVerificationTick] = useState(0)
  const [response, setResponse] = useState<GiftRecommendationResponse | null>(null)
  const [theme, setTheme] = useState<GiftThemeId | null>(null)

  const checkoutHeading = useRef<HTMLHeadingElement>(null)
  const finalHeading = useRef<HTMLHeadingElement>(null)
  const pendingFocus = useRef<FocusTarget | null>(null)
  const returnHeading = useRef<HTMLHeadingElement>(null)
  const roundHeading = useRef<HTMLHeadingElement>(null)
  const setupHeading = useRef<HTMLHeadingElement>(null)

  const currentRound = picks.length
  const currentIdeas = response?.ideas.slice(currentRound * 3, currentRound * 3 + 3) ?? []
  const finalists = picks
    .map((pick) => response?.ideas.find((idea) => idea.id === pick))
    .filter((idea): idea is GiftIdea => Boolean(idea))
  const selectedIdea = finalists.find((idea) => idea.id === finalId) ?? null
  const verifiedReturn = paymentReturnCopy(paymentVerification)

  function requestFocus(target: FocusTarget) {
    pendingFocus.current = target
    setFocusTick((current) => current + 1)
  }

  function retryAvailability() {
    setAvailability(null)
    setAvailabilityCheckFailed(false)
    setAvailabilityCheckTick((current) => current + 1)
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = readStoredDraft()
      if (stored) {
        setBudget(stored.budget)
        setCompleted(stored.completed)
        setFinalId(stored.finalId)
        setPicks(stored.picks)
        setResponse(stored.response)
        setTheme(stored.theme)
      }

      const checkout = new URLSearchParams(window.location.search).get('checkout')
      if (checkout === 'success' || checkout === 'canceled') {
        setCheckoutReturn(checkout)
        if (checkout === 'success') {
          setCompleted(false)
          setPaymentVerification('checking')
        }
      }

      setHasRestored(true)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), availabilityRequestTimeoutMs)

    void (async () => {
      try {
        const result = await fetch(ideasEndpoint, {
          cache: 'no-store',
          credentials: 'omit',
          headers: { Accept: 'application/json' },
          method: 'GET',
          redirect: 'error',
          signal: controller.signal,
        })
        const data = await readJSON(result, maximumCheckoutBytes)
        if (!result.ok || !isGiftAvailability(data)) throw new Error('invalid_status')
        if (active) setAvailability(data)
      } catch {
        if (active) {
          setAvailability(null)
          setAvailabilityCheckFailed(true)
        }
      } finally {
        window.clearTimeout(timeout)
      }
    })()

    return () => {
      active = false
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [availabilityCheckTick, ideasEndpoint])

  useEffect(() => {
    if (availability?.inventoryStatus !== 'restocking') return
    const retry = window.setTimeout(() => {
      setAvailability(null)
      setAvailabilityCheckFailed(false)
      setAvailabilityCheckTick((current) => current + 1)
    }, 60_000)
    return () => window.clearTimeout(retry)
  }, [availability?.inventoryStatus, availabilityCheckTick])

  useEffect(() => {
    if (!hasRestored || checkoutReturn !== 'success') return

    const search = new URLSearchParams(window.location.search)
    const sessionIds = search.getAll('session_id')
    const sessionId = sessionIds[0]
    const controller = new AbortController()
    let active = true
    let timeout: number | undefined

    void (async () => {
      await Promise.resolve()
      if (controller.signal.aborted) return

      if (
        sessionIds.length !== 1 ||
        !sessionId ||
        !/^cs_(?:test|live)_[A-Za-z0-9]{16,255}$/.test(sessionId)
      ) {
        setCompleted(false)
        setPaymentVerification('unverified')
        return
      }

      setPaymentVerification('checking')
      timeout = window.setTimeout(() => controller.abort(), paymentRequestTimeoutMs)
      try {
        const endpoint = new URL(paymentStatusEndpoint, window.location.origin)
        endpoint.searchParams.set('session_id', sessionId)
        const result = await fetch(endpoint.toString(), {
          cache: 'no-store',
          credentials: 'omit',
          headers: { Accept: 'application/json' },
          method: 'GET',
          redirect: 'error',
          signal: controller.signal,
        })
        const data = await readJSON(result, maximumCheckoutBytes)
        if (!active) return
        if (!result.ok || !isGiftPaymentStatusResponse(data)) {
          setCompleted(false)
          setPaymentVerification('unverified')
          return
        }

        const status = data.paymentStatus
        setCompleted(
          status === 'paid' ||
            status === 'pending' ||
            status === 'partially_refunded' ||
            status === 'refunded',
        )
        setPaymentVerification(status)
        setLiveMessage(`Stripe payment status: ${status.replaceAll('_', ' ')}.`)
      } catch {
        if (active) {
          setCompleted(false)
          setPaymentVerification('unverified')
        }
      } finally {
        if (timeout !== undefined) window.clearTimeout(timeout)
      }
    })()

    return () => {
      active = false
      if (timeout !== undefined) window.clearTimeout(timeout)
      controller.abort()
    }
  }, [checkoutReturn, hasRestored, paymentStatusEndpoint, paymentVerificationTick])

  useEffect(() => {
    if (!hasRestored) return

    try {
      if (!response || !budget || !theme) {
        window.localStorage.removeItem(storageKey)
        return
      }

      const stored: StoredGiftDraft = {
        budget,
        completed,
        finalId,
        picks,
        response,
        theme,
        version: 1,
      }
      window.localStorage.setItem(storageKey, JSON.stringify(stored))
    } catch {
      // The game remains usable when storage is blocked or full.
    }
  }, [budget, completed, finalId, hasRestored, picks, response, theme])

  useEffect(() => {
    const target = pendingFocus.current
    if (!target) return

    const headings = {
      checkout: checkoutHeading.current,
      final: finalHeading.current,
      round: roundHeading.current,
      setup: setupHeading.current,
    }
    headings[target]?.focus()
    pendingFocus.current = null
  }, [focusTick])

  useEffect(() => {
    if (!checkoutReturn) return
    const frame = window.requestAnimationFrame(() => returnHeading.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [checkoutReturn])

  function clearCheckoutQuery() {
    const url = new URL(window.location.href)
    url.searchParams.delete('checkout')
    url.searchParams.delete('session_id')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }

  function resetGame() {
    setCheckoutReturn(null)
    setCompleted(false)
    setError(null)
    setFinalId(null)
    setHasAcknowledgedContribution(false)
    setPicks([])
    setPaymentVerification(null)
    setResponse(null)
    setLiveMessage('Ready for a new Gift Draft.')
    try {
      window.localStorage.removeItem(storageKey)
    } catch {
      // Storage is optional.
    }
    clearCheckoutQuery()
    requestFocus('setup')
  }

  async function dealDeck() {
    if (!budget || !theme || isLoading || availability?.ideasEnabled !== true) return

    const request = validateGiftRecommendationRequest({
      anonymousToken: anonymousToken(),
      budget,
      theme,
      variationSeed: randomToken(),
    })

    if (!request.ok) {
      setError(request.error)
      return
    }

    setCheckoutReturn(null)
    setCompleted(false)
    setError(null)
    setHasAcknowledgedContribution(false)
    setIsLoading(true)
    setLiveMessage('')
    setLoadingMessage('Assembling your cached concept deck…')
    setPaymentVerification(null)
    clearCheckoutQuery()

    const controller = new AbortController()
    const progressTimers = [
      window.setTimeout(() => setLoadingMessage('Opening the ready concept inventory…'), 2_200),
      window.setTimeout(() => setLoadingMessage('Checking the nine-concept mix…'), 5_000),
    ]
    const timeout = window.setTimeout(() => controller.abort(), 70_000)

    try {
      const result = await fetch(ideasEndpoint, {
        body: JSON.stringify(request.value),
        cache: 'no-store',
        credentials: 'omit',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method: 'POST',
        redirect: 'error',
        signal: controller.signal,
      })
      const data = await readJSON(result, maximumRecommendationBytes)

      if (!result.ok) {
        if (result.status === 503) {
          setAvailability((current) => ({
            checkoutEnabled: current?.checkoutEnabled ?? false,
            ideasEnabled: false,
            inventoryStatus: 'restocking',
          }))
        }
        setError(
          safeAPIMessage(
            data,
            'The cached concept inventory could not assemble a usable deck. Review the settings and try again.',
          ),
        )
        return
      }

      if (!isGiftRecommendationResponse(data)) {
        throw new Error('invalid_response')
      }

      setFinalId(null)
      setPicks([])
      setResponse(data)
      setLiveMessage('Nine AI-created gift concepts are ready. Round 1 of 3.')
      requestFocus('round')
    } catch {
      setError(
        controller.signal.aborted
          ? 'The cached concept inventory took too long to answer. Try dealing another deck.'
          : 'The cached concept inventory could not be reached. No checkout was started; please try again.',
      )
    } finally {
      progressTimers.forEach((timer) => window.clearTimeout(timer))
      window.clearTimeout(timeout)
      setIsLoading(false)
    }
  }

  function keepIdea(idea: GiftIdea) {
    if (!currentIdeas.some((candidate) => candidate.id === idea.id)) return

    const nextPicks = [...picks, idea.id]
    setError(null)
    setPicks(nextPicks)
    setLiveMessage(
      nextPicks.length === 3
        ? `${idea.name} was kept. Your three finalists are ready.`
        : `${idea.name} was kept. Round ${nextPicks.length + 1} of 3 is ready.`,
    )
    requestFocus(nextPicks.length === 3 ? 'final' : 'round')
  }

  function editRound(roundIndex: number) {
    setCompleted(false)
    setError(null)
    setFinalId(null)
    setHasAcknowledgedContribution(false)
    setPicks((current) => current.slice(0, roundIndex))
    setLiveMessage(`Round ${roundIndex + 1} is ready to choose again.`)
    requestFocus('round')
  }

  function chooseFinal(idea: GiftIdea) {
    if (!picks.includes(idea.id)) return
    setError(null)
    setFinalId(idea.id)
    setHasAcknowledgedContribution(false)
    setLiveMessage(`${idea.name} is selected. Review the funding disclosure before checkout.`)
    requestFocus('checkout')
  }

  async function startCheckout() {
    if (
      !selectedIdea ||
      !hasAcknowledgedContribution ||
      isCheckingOut ||
      completed ||
      availability?.checkoutEnabled !== true
    ) {
      return
    }

    setError(null)
    setIsCheckingOut(true)
    setLiveMessage('Opening secure Stripe Checkout…')
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), paymentRequestTimeoutMs)

    try {
      const result = await fetch(checkoutEndpoint, {
        body: JSON.stringify({ quoteToken: selectedIdea.quoteToken }),
        cache: 'no-store',
        credentials: 'omit',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method: 'POST',
        redirect: 'error',
        signal: controller.signal,
      })
      const data = await readJSON(result, maximumCheckoutBytes)

      if (!result.ok) {
        setError(
          safeAPIMessage(
            data,
            'Stripe Checkout could not be opened. No new checkout was started; try another idea or deal a new deck.',
          ),
        )
        return
      }

      if (!isGiftCheckoutResponse(data)) throw new Error('invalid_response')

      const checkoutUrl = safeStripeCheckoutURL(data.checkoutUrl)
      if (!checkoutUrl) throw new Error('invalid_checkout_url')
      window.location.assign(checkoutUrl)
    } catch {
      setError(
        controller.signal.aborted
          ? 'Stripe Checkout took too long to answer. No new checkout was started; please try again.'
          : 'Stripe Checkout could not be reached. No new checkout was started; please try again.',
      )
    } finally {
      window.clearTimeout(timeout)
      setIsCheckingOut(false)
    }
  }

  return (
    <div className="page-shell gift-page">
      <header className="page-hero shell">
        <p className="eyebrow">SABERISTIC / GIFT DRAFT</p>
        <h1>Pick one. Pass two. Make my day.</h1>
        <p className="page-hero__lede">
          Keep one of three AI-created gift concepts in each round. The deck loads instantly from
          cached inventory while background generation creates concepts for later games.
        </p>
        <p className="safety-line safety-line--large">
          <span aria-hidden="true">◇</span> Concepts, descriptions, and artwork are AI-generated.
          Suggested amounts are gift contributions, not retail prices. Saberistic does not sell,
          order, or ship the depicted items, and AmirSaber may use a contribution toward any gift.
        </p>
      </header>

      <div className="shell gift-page__body">
        {checkoutReturn ? (
          <section
            aria-labelledby="gift-return-heading"
            className={`gift-return-notice gift-return-notice--${checkoutReturn}`}
            role="status"
          >
            <p className="eyebrow">
              {checkoutReturn === 'success' ? verifiedReturn.eyebrow : 'CHECKOUT CANCELED'}
            </p>
            <h2 id="gift-return-heading" ref={returnHeading} tabIndex={-1}>
              {checkoutReturn === 'success'
                ? verifiedReturn.title
                : 'Your Gift Draft is still here.'}
            </h2>
            <p>
              {checkoutReturn === 'success'
                ? verifiedReturn.body
                : 'Stripe returned this checkout as canceled. Your saved rounds and finalist remain available below.'}
            </p>
            {checkoutReturn === 'success' ? (
              paymentVerification === 'checking' ? (
                <button className="button" disabled type="button">
                  Checking Stripe…
                </button>
              ) : paymentVerification === 'pending' || paymentVerification === 'unverified' ? (
                <button
                  className="button button--quiet"
                  onClick={() => {
                    setPaymentVerification('checking')
                    setPaymentVerificationTick((current) => current + 1)
                  }}
                  type="button"
                >
                  Check Stripe again
                </button>
              ) : (
                <button className="button" onClick={resetGame} type="button">
                  Start another Gift Draft
                </button>
              )
            ) : (
              <button
                className="button button--quiet"
                onClick={() => {
                  setCheckoutReturn(null)
                  setPaymentVerification(null)
                  clearCheckoutQuery()
                  requestFocus(finalId ? 'checkout' : response ? 'round' : 'setup')
                }}
                type="button"
              >
                Return to the saved draft
              </button>
            )}
          </section>
        ) : null}

        <section
          aria-busy={isLoading || isCheckingOut}
          aria-labelledby="gift-game-title"
          className="gift-game"
        >
          <h2 className="sr-only" id="gift-game-title">
            Gift Draft game
          </h2>
          <p aria-atomic="true" aria-live="polite" className="sr-only">
            {liveMessage}
          </p>

          {error ? (
            <div className="gift-error" role="alert">
              <strong>The draft stopped here.</strong>
              <span>{error}</span>
            </div>
          ) : null}

          {isLoading ? <GiftLoading message={loadingMessage} /> : null}

          {!isLoading && !response ? (
            <GiftSetup
              availability={availability}
              availabilityCheckFailed={availabilityCheckFailed}
              budget={budget}
              onAvailabilityRetry={retryAvailability}
              onBudgetChange={(value) => {
                setBudget(value)
                setError(null)
              }}
              onDeal={dealDeck}
              onThemeChange={(value) => {
                setTheme(value)
                setError(null)
              }}
              setupHeading={setupHeading}
              theme={theme}
            />
          ) : null}

          {!isLoading && response ? (
            <>
              <GiftProgress picks={picks} />

              {currentRound < 3 ? (
                <div className="gift-round">
                  <div className="gift-stage-heading gift-round__heading">
                    <p className="eyebrow">ROUND {currentRound + 1} OF 3</p>
                    <h2 ref={roundHeading} tabIndex={-1}>
                      Keep one. The other two leave the deck.
                    </h2>
                    <p>
                      These AI-created concepts came from cached inventory. The artwork depicts an
                      idea, not an item offered for sale, and the suggested amount is a gift
                      contribution rather than a retail price.
                    </p>
                  </div>
                  <div className="gift-card-grid">
                    {currentIdeas.map((idea, index) => (
                      <GiftIdeaCard
                        actionLabel="Keep this one"
                        displayIndex={index + 1}
                        idPrefix={`gift-round-${currentRound + 1}-option-${index + 1}`}
                        idea={idea}
                        key={idea.id}
                        onSelect={() => keepIdea(idea)}
                      />
                    ))}
                  </div>
                  <div className="gift-game__actions gift-game__actions--round">
                    <p>{response.disclaimer}</p>
                    <button className="button button--quiet" onClick={resetGame} type="button">
                      Change the settings
                    </button>
                  </div>
                </div>
              ) : (
                <div className="gift-final">
                  <div className="gift-stage-heading">
                    <p className="eyebrow">FINAL / THREE PICKS</p>
                    <h2 ref={finalHeading} tabIndex={-1}>
                      Choose your final gift concept.
                    </h2>
                    <p>
                      Choose the concept that best captures your intention, then review exactly who
                      receives the fixed contribution and what the generated concept represents.
                    </p>
                  </div>

                  <div className="gift-card-grid gift-card-grid--finalists">
                    {finalists.map((idea, index) => (
                      <div className="gift-finalist" key={idea.id}>
                        <GiftIdeaCard
                          actionLabel="Choose this finalist"
                          displayIndex={index + 1}
                          idPrefix={`gift-final-option-${index + 1}`}
                          idea={idea}
                          onSelect={() => chooseFinal(idea)}
                          selected={finalId === idea.id}
                        />
                        <button
                          className="gift-finalist__edit"
                          onClick={() => editRound(index)}
                          type="button"
                        >
                          Change round {index + 1} pick
                        </button>
                      </div>
                    ))}
                  </div>

                  {selectedIdea ? (
                    <section
                      aria-labelledby="gift-checkout-heading"
                      className="gift-checkout-disclosure"
                    >
                      <div>
                        <p className="eyebrow">BEFORE STRIPE</p>
                        <h3 id="gift-checkout-heading" ref={checkoutHeading} tabIndex={-1}>
                          You are funding a gift idea—not buying the depicted item.
                        </h3>
                        <p>
                          The model suggested a{' '}
                          {formatPrice(selectedIdea.suggestedContributionCents)} contribution for{' '}
                          {selectedIdea.name}. Stripe would send that fixed amount to Saberistic,
                          not to a seller. Saberistic does not sell, order, or ship the depicted
                          item.
                        </p>
                        <p>
                          The AI-created concept and generated artwork are inspiration, not a
                          promise that an exact item exists or will be purchased. AmirSaber may use
                          the contribution toward this idea, a substitute, related costs, or any
                          other gift.
                        </p>
                      </div>

                      <div>
                        <dl className="gift-checkout-facts">
                          <div>
                            <dt>Gift recipient</dt>
                            <dd>{giftRecipientProfile.name}</dd>
                          </div>
                          <div>
                            <dt>Payment recipient</dt>
                            <dd>Saberistic</dd>
                          </div>
                          <div>
                            <dt>Selected concept</dt>
                            <dd>{selectedIdea.name} — AI-created inspiration</dd>
                          </div>
                          <div>
                            <dt>Model-suggested contribution at Stripe</dt>
                            <dd>{formatPrice(selectedIdea.suggestedContributionCents)}</dd>
                          </div>
                          <div>
                            <dt>How it is used</dt>
                            <dd>This concept, related costs, a substitute, or any other gift</dd>
                          </div>
                        </dl>
                        <p className="gift-checkout-disclaimer">{response.disclaimer}</p>

                        {availabilityCheckFailed ? (
                          <div className="gift-checkout-complete" role="note">
                            <strong>The page could not check contribution availability.</strong>
                            <span>
                              No Stripe Checkout can open until the status check succeeds.
                            </span>
                            <button
                              className="button button--quiet"
                              onClick={retryAvailability}
                              type="button"
                            >
                              Try status again
                            </button>
                          </div>
                        ) : availability === null ? (
                          <div className="gift-checkout-complete" role="note">
                            <strong>Checking contribution availability…</strong>
                            <span>No Stripe Checkout can open while this check is running.</span>
                          </div>
                        ) : !availability.checkoutEnabled ? (
                          <div className="gift-checkout-complete" role="note">
                            <strong>Gift contribution checkout is currently paused.</strong>
                            <span>
                              You can still finish the game and review the AI-created concept. No
                              payment can be taken until the Stripe path finishes acceptance.
                            </span>
                          </div>
                        ) : completed ? (
                          <div className="gift-checkout-complete" role="note">
                            <strong>This saved draft already has a Stripe Checkout session.</strong>
                            <span>
                              A second checkout is disabled here. Check the result of that session
                              or start another Gift Draft for a new gift.
                            </span>
                          </div>
                        ) : (
                          <>
                            <label className="gift-checkout-acknowledgment">
                              <input
                                checked={hasAcknowledgedContribution}
                                onChange={(event) =>
                                  setHasAcknowledgedContribution(event.currentTarget.checked)
                                }
                                type="checkbox"
                              />
                              <span>
                                I understand this is a fixed gift contribution to Saberistic, not a
                                purchase or order of the depicted item.
                              </span>
                            </label>
                            <button
                              className="button gift-checkout-button"
                              disabled={isCheckingOut || !hasAcknowledgedContribution}
                              onClick={startCheckout}
                              type="button"
                            >
                              {isCheckingOut
                                ? 'Opening Stripe Checkout…'
                                : `Open Stripe Checkout — ${formatPrice(selectedIdea.suggestedContributionCents)}`}
                            </button>
                          </>
                        )}
                      </div>
                    </section>
                  ) : (
                    <p className="gift-final__prompt">Choose one finalist to reveal checkout.</p>
                  )}

                  <div className="gift-game__actions">
                    <p>
                      {availabilityCheckFailed
                        ? 'The page could not check whether a new Gift Draft can start.'
                        : availability === null
                          ? 'Checking whether a new Gift Draft can start…'
                          : availability.ideasEnabled
                            ? 'Want a different set? Deal instantly from cached concepts while background generation creates future games.'
                            : availability.inventoryStatus === 'restocking'
                              ? 'New AI gift concepts and artwork are being generated for the next game.'
                              : 'New Gift Drafts are paused right now. Try again later.'}
                    </p>
                    <button
                      className="button button--quiet"
                      disabled={
                        isLoading ||
                        isCheckingOut ||
                        (!availabilityCheckFailed && availability?.ideasEnabled !== true)
                      }
                      onClick={availabilityCheckFailed ? retryAvailability : dealDeck}
                      type="button"
                    >
                      {availabilityCheckFailed
                        ? 'Try status again'
                        : availability === null
                          ? 'Checking Gift Draft…'
                          : availability.ideasEnabled
                            ? 'Deal a new deck'
                            : availability.inventoryStatus === 'restocking'
                              ? 'Generating new concepts…'
                              : 'Gift Draft is paused'}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </section>

        <aside aria-labelledby="gift-method-heading" className="gift-method">
          <div>
            <p className="eyebrow">METHOD / FIT, CACHE, CLARITY</p>
            <h2 id="gift-method-heading">A playful draft with a literal payment boundary.</h2>
          </div>
          <div className="gift-method__grid">
            <section>
              <span aria-hidden="true">01</span>
              <h3>Appropriate by design</h3>
              <p>
                AI-created concepts are matched to AmirSaber’s published interests: useful, durable,
                design-conscious tools, books, desk objects, and reasons to step away from a screen.
              </p>
            </section>
            <section>
              <span aria-hidden="true">02</span>
              <h3>Different every game</h3>
              <p>
                Each game deals from a ready concept cache. Background generation adds concepts and
                artwork to that rolling inventory for later games without slowing this draw.
              </p>
            </section>
            <section>
              <span aria-hidden="true">03</span>
              <h3>Suggested amount, fixed contribution</h3>
              <p>
                The model-suggested amount is not a retail price, and generated artwork represents
                an idea rather than an item for sale. Stripe would collect a clearly disclosed gift
                contribution for Saberistic; no item is ordered or shipped automatically.
              </p>
            </section>
          </div>
        </aside>
      </div>
    </div>
  )
}
