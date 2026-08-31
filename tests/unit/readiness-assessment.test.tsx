// @vitest-environment jsdom

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ReadinessInteractive } from '../../apps/site/src/app/readiness/ReadinessStaticPage'
import { diagnosticPrivacyNoticeVersion } from '@/lib/diagnostic'
import { safeDiagnosticCheckoutURL } from '@/components/readiness/DiagnosticLeadForm'
import { ReadinessAssessment } from '@/components/readiness/ReadinessAssessment'
import {
  createDeterministicReadinessReport,
  readinessPolicyVersion,
  readinessQuestionById,
  readinessQuestionsV1,
  readinessSectionsV1,
  scoreReadiness,
  type ReadinessAnswers,
  type ReadinessManifest,
  type ReadinessReport,
} from '@/lib/readiness'

const navigationState = vi.hoisted(() => ({ query: '' }))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(navigationState.query),
}))

const reportLevelLabels: Record<ReadinessReport['level'], string> = {
  demo_only: 'Demo only',
  internal_beta: 'Internal beta',
  limited_production: 'Limited production',
  production_candidate: 'Production candidate',
}

function controlledAnswers(): ReadinessAnswers {
  return Object.fromEntries(
    readinessQuestionsV1.map((question) => [question.id, question.options[0]?.value]),
  ) as ReadinessAnswers
}

function deterministicReport(): ReadinessReport {
  const manifest: ReadinessManifest = {
    answers: controlledAnswers(),
    policyVersion: readinessPolicyVersion,
    profile: 'ai_saas',
  }

  return createDeterministicReadinessReport(manifest, scoreReadiness(manifest))
}

function assessmentResponse(
  report: ReadinessReport,
  fallbackUsed: boolean,
  handoffToken: string | null = null,
): Response {
  return Response.json({
    fallbackUsed,
    handoffToken,
    report,
    reportId: 'readiness-report-123',
  })
}

async function answerEveryQuestion(
  view: ReturnType<typeof render>,
  overrides: Partial<ReadinessAnswers> = {},
) {
  for (let sectionIndex = 0; sectionIndex < readinessSectionsV1.length; sectionIndex += 1) {
    const section = readinessSectionsV1[sectionIndex]

    for (const questionId of section.questionIds) {
      const question = readinessQuestionById[questionId]
      const option =
        question.options.find((item) => item.value === overrides[questionId]) ?? question.options[0]
      const input = view.container.querySelector<HTMLInputElement>(
        `input[name="${questionId}"][value="${option?.value}"]`,
      )
      expect(input).not.toBeNull()
      fireEvent.click(input as HTMLInputElement)
    }

    if (sectionIndex < readinessSectionsV1.length - 1) {
      fireEvent.click(view.getByRole('button', { name: 'Continue' }))
      const nextSection = readinessSectionsV1[sectionIndex + 1]
      await waitFor(() => {
        expect(view.getByRole('heading', { level: 2, name: nextSection.label })).toBeTruthy()
      })
    }
  }
}

beforeEach(() => {
  navigationState.query = ''
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    return window.setTimeout(() => callback(performance.now()), 0)
  })
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => window.clearTimeout(handle))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('readiness assessment experience', () => {
  it('gates an incomplete section, announces the error, and focuses the first unanswered group', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const view = render(<ReadinessAssessment />)

    fireEvent.click(view.getByRole('button', { name: 'Continue' }))

    expect(view.getByRole('alert').textContent).toContain(
      'Choose one answer for every question in this section before continuing.',
    )
    expect(document.activeElement).toBe(
      view.container.querySelector('#question-architecture\\.scope'),
    )
    expect(view.getByRole('progressbar').getAttribute('aria-label')).toBe(
      'Assessment progress: section 1 of 5',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('submits only the normalized controlled payload and labels a deterministic fallback', async () => {
    const report = {
      ...deterministicReport(),
      nextStep: {
        id: 'self_serve' as const,
        label: 'Continue with self-serve guidance',
        reason: 'Continue with the fixed action plan and refresh its evidence periodically.',
      },
    }
    const fetchMock = vi.fn(async () => assessmentResponse(report, true))
    vi.stubGlobal('fetch', fetchMock)
    const view = render(<ReadinessAssessment />)

    fireEvent.click(view.getByRole('button', { name: /^Payments product/ }))
    await answerEveryQuestion(view)
    fireEvent.change(
      view.getByRole('textbox', {
        name: /Optional: what is the single production symptom worrying you most?/,
      }),
      { target: { value: 'Retries are causing uneven release confidence.' } },
    )
    fireEvent.click(view.getByRole('button', { name: 'Generate readiness report' }))

    expect(
      await view.findByRole('heading', {
        level: 1,
        name: reportLevelLabels[report.level],
      }),
    ).toBeTruthy()
    expect(view.container.querySelectorAll('h1')).toHaveLength(1)
    expect(view.getByText(/Deterministic report —/)).toBeTruthy()
    expect(view.getByRole('link', { name: 'Review your action plan' }).getAttribute('href')).toBe(
      '#plan-heading',
    )
    expect(fetchMock).toHaveBeenCalledOnce()

    const [endpoint, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(endpoint).toBe('/api/readiness/assess')
    expect(init).toEqual({
      body: expect.any(String),
      cache: 'no-store',
      credentials: 'omit',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
      redirect: 'error',
    })

    const request = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(request).toEqual({
      anonymousToken: expect.stringMatching(/^[A-Za-z0-9._~-]{16,512}$/),
      answers: controlledAnswers(),
      policyVersion: readinessPolicyVersion,
      profile: 'payments',
      symptom: 'Retries are causing uneven release confidence.',
    })
  })

  it('rejects unsafe optional text locally before any request is made', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const view = render(<ReadinessAssessment />)

    await answerEveryQuestion(view)
    fireEvent.change(
      view.getByRole('textbox', {
        name: /Optional: what is the single production symptom worrying you most?/,
      }),
      { target: { value: 'The failure is documented at https://private.example.test/logs.' } },
    )
    fireEvent.click(view.getByRole('button', { name: 'Generate readiness report' }))

    expect(view.getByRole('alert').textContent).toContain(
      'Remove URLs, domains, and repository locations from the symptom.',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('labels a model-enhanced result and maps Engineering Rescue to its service', async () => {
    const report: ReadinessReport = {
      ...deterministicReport(),
      explanationSource: 'model',
      nextStep: {
        id: 'engineering_rescue_inquiry',
        label: 'Engineering Rescue inquiry',
        reason: 'The declared impact calls for focused stabilization support.',
      },
      summary: 'The enhanced explanation preserves the deterministic result and approved actions.',
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => assessmentResponse(report, false)),
    )
    const view = render(<ReadinessAssessment />)

    await answerEveryQuestion(view)
    fireEvent.click(view.getByRole('button', { name: 'Generate readiness report' }))

    await view.findByRole('heading', {
      level: 1,
      name: reportLevelLabels[report.level],
    })
    expect(view.getByText(/AI-tailored explanation/)).toBeTruthy()
    expect(view.getByRole('link', { name: 'Review Engineering Rescue' }).getAttribute('href')).toBe(
      '/#engineering-rescue',
    )
  })

  it('opens an unavailable paid handoff without hiding the complete free report', async () => {
    const report: ReadinessReport = {
      ...deterministicReport(),
      nextStep: {
        id: 'architecture_diagnostic',
        label: 'Start the Architecture Diagnostic',
        reason: 'A focused review is the next deterministic step.',
      },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => assessmentResponse(report, true)),
    )
    const view = render(<ReadinessAssessment />)

    await answerEveryQuestion(view)
    fireEvent.click(view.getByRole('button', { name: 'Generate readiness report' }))

    await view.findByRole('heading', {
      level: 1,
      name: reportLevelLabels[report.level],
    })
    expect(view.getByRole('heading', { name: 'Start the Architecture Diagnostic' })).toBeTruthy()
    expect(view.getByText(report.summary)).toBeTruthy()
    fireEvent.click(view.getByRole('button', { name: 'Start the $200 diagnostic handoff' }))
    const unavailableHeading = view.getByRole('heading', {
      name: 'Your free report is still complete.',
    })
    expect(unavailableHeading).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(unavailableHeading))
    expect(view.queryByLabelText('Work email')).toBeNull()
  })

  it('collects contact details only after the report and sends a consented Stripe handoff', async () => {
    const report: ReadinessReport = {
      ...deterministicReport(),
      blockers: [
        {
          dependencyOrder: 1,
          evidence: [],
          evidenceQuestionIds: ['identity.authorization'],
          explanation: 'Authorization is still an architectural gate.',
          label: 'Authorization boundary is unverified',
          maxLevel: 'internal_beta',
          rationale: 'Privileged paths need a verified authorization boundary.',
          ruleId: 'SEC-AUTHZ-001',
          severity: 'critical',
          verification: 'Exercise one allowed and one denied privileged request.',
        },
      ],
      nextStep: {
        id: 'self_serve',
        label: 'Continue with self-serve guidance',
        reason: 'The deterministic report remains the primary recommendation.',
      },
    }
    const checkoutUrl = 'https://checkout.stripe.com/c/pay_diagnostic_123'
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input).includes('/api/readiness/assess')) {
        return assessmentResponse(report, true, 'signed-handoff-token-1234567890')
      }

      return Response.json(
        {
          checkoutUrl,
          requestId: 'diagnostic-request-123',
        },
        { status: 201 },
      )
    })
    const assign = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('location', { assign })
    const view = render(
      <ReadinessAssessment
        diagnosticEndpoint="https://api.example.test/api/diagnostics/requests"
        diagnosticIntent
      />,
    )

    expect(view.queryByLabelText('Work email')).toBeNull()
    await answerEveryQuestion(view)
    fireEvent.click(view.getByRole('button', { name: 'Generate readiness report' }))

    expect(
      await view.findByRole('heading', { name: 'Turn the findings into a decision.' }),
    ).toBeTruthy()
    expect(view.getByText(/No newsletter/)).toBeTruthy()
    expect(view.getByText(/not sent to OpenRouter/)).toBeTruthy()
    expect(view.getByText(/verified readiness report is sent to Saberistic/)).toBeTruthy()
    expect(
      view
        .getByRole('link', { name: 'privacy and diagnostic-processing notice' })
        .getAttribute('href'),
    ).toBe('/privacy#diagnostic-processing-heading')
    expect(view.getByText(/you’ll pick the exact available slot after checkout/)).toBeTruthy()

    fireEvent.change(view.getByLabelText('Name'), { target: { value: 'Ada Lovelace' } })
    fireEvent.change(view.getByLabelText('Work email'), {
      target: { value: 'ADA@EXAMPLE.COM' },
    })
    fireEvent.change(view.getByLabelText(/Company/), { target: { value: 'Analytical Engines' } })
    fireEvent.click(view.getByLabelText(/^This week/))
    fireEvent.click(view.getByLabelText('Morning'))
    fireEvent.click(
      view.getByLabelText(/^Use my readiness summary in the private diagnostic review/),
    )
    fireEvent.click(view.getByLabelText(/Authorization boundary is unverified/))
    fireEvent.change(view.getByLabelText(/Anything else that would make the call sharper/), {
      target: { value: 'We need a practical release boundary before the next launch.' },
    })
    fireEvent.click(
      view.getByLabelText(/Saberistic may contact me about this Architecture Diagnostic/),
    )
    fireEvent.click(view.getByRole('button', { name: 'Continue to Stripe · $200' }))

    await waitFor(() => expect(assign).toHaveBeenCalledWith(checkoutUrl))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [endpoint, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit]
    expect(endpoint).toBe('https://api.example.test/api/diagnostics/requests')
    expect(init).toEqual({
      body: expect.any(String),
      cache: 'no-store',
      credentials: 'omit',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
      redirect: 'error',
    })
    expect(JSON.parse(String(init.body))).toEqual({
      anonymousToken: expect.stringMatching(/^[A-Za-z0-9._~-]{16,512}$/),
      contact: {
        company: 'Analytical Engines',
        email: 'ada@example.com',
        name: 'Ada Lovelace',
      },
      consent: {
        contact: true,
        privacy: true,
        privacyVersion: diagnosticPrivacyNoticeVersion,
      },
      context: 'We need a practical release boundary before the next launch.',
      handoffToken: 'signed-handoff-token-1234567890',
      report,
      selectedBlockerIds: ['SEC-AUTHZ-001'],
      shareSummary: true,
      timeBand: 'morning',
      timeframe: 'this_week',
      timezone: expect.any(String),
    })
  })

  it('rejects a lookalike Stripe checkout URL without navigating', async () => {
    const report = {
      ...deterministicReport(),
      nextStep: {
        id: 'architecture_diagnostic' as const,
        label: 'Start the Architecture Diagnostic',
        reason: 'A focused review is the next deterministic step.',
      },
    }
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input).includes('/api/readiness/assess')) {
        return assessmentResponse(report, true, 'signed-handoff-token-1234567890')
      }

      return Response.json({
        checkoutUrl: 'https://checkout.stripe.com.attacker.example/pay',
        requestId: 'diagnostic-request-123',
      })
    })
    const assign = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('location', { assign })
    const view = render(<ReadinessAssessment />)

    await answerEveryQuestion(view)
    fireEvent.click(view.getByRole('button', { name: 'Generate readiness report' }))
    await view.findByRole('heading', { level: 1, name: reportLevelLabels[report.level] })
    fireEvent.click(view.getByRole('button', { name: 'Start the $200 diagnostic handoff' }))
    fireEvent.change(view.getByLabelText('Name'), { target: { value: 'Grace Hopper' } })
    fireEvent.change(view.getByLabelText('Work email'), {
      target: { value: 'grace@example.com' },
    })
    fireEvent.click(
      view.getByLabelText(/Saberistic may contact me about this Architecture Diagnostic/),
    )
    fireEvent.click(view.getByRole('button', { name: 'Continue to Stripe · $200' }))

    expect(
      await view.findByText(
        'Secure Stripe Checkout could not be opened. No checkout was started; please try again.',
      ),
    ).toBeTruthy()
    expect(assign).not.toHaveBeenCalled()
  })

  it('keeps malformed reports out of the render tree', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          fallbackUsed: true,
          handoffToken: null,
          report: { score: 67, summary: 'Incomplete report' },
          reportId: 'readiness-report-123',
        }),
      ),
    )
    const view = render(<ReadinessAssessment />)

    await answerEveryQuestion(view)
    fireEvent.click(view.getByRole('button', { name: 'Generate readiness report' }))

    expect(
      (
        await view.findByText(
          'The assessment service could not be reached. Your answers remain only in this browser; please try again.',
        )
      ).getAttribute('role'),
    ).toBe('alert')
    expect(
      (
        view.getByRole('button', {
          name: 'Generate readiness report',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false)
  })

  it('preserves a cross-field validation error while returning focus to its question', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const view = render(<ReadinessAssessment />)

    await answerEveryQuestion(view, {
      'identity.data_classification': 'classified_sensitive',
      'identity.deletion': 'not_applicable',
      'operations.backups': 'not_applicable',
    })
    fireEvent.click(view.getByRole('button', { name: 'Generate readiness report' }))

    expect(await view.findByRole('heading', { level: 2, name: 'Identity and data' })).toBeTruthy()
    expect(view.getByRole('alert').textContent).toContain(
      'Retained user, customer, or sensitive data requires a deletion-path answer.',
    )
    await waitFor(() => {
      expect(document.activeElement).toBe(
        view.container.querySelector('#question-identity\\.deletion'),
      )
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('prints, downloads safely, and restores focus after resetting the result', async () => {
    const report = deterministicReport()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => assessmentResponse(report, true)),
    )
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:report')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    const view = render(<ReadinessAssessment />)

    await answerEveryQuestion(view)
    fireEvent.click(view.getByRole('button', { name: 'Generate readiness report' }))
    await view.findByRole('heading', {
      level: 1,
      name: reportLevelLabels[report.level],
    })

    fireEvent.click(view.getByRole('button', { name: 'Print or save as PDF' }))
    expect(print).toHaveBeenCalledOnce()

    fireEvent.click(view.getByRole('button', { name: 'Download report' }))
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(anchorClick).toHaveBeenCalledOnce()
    const link = anchorClick.mock.contexts[0] as HTMLAnchorElement
    expect(link.download).toBe(
      `saberistic-readiness-${readinessPolicyVersion}-${report.level}.json`,
    )
    expect(link.href).toBe('blob:report')
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:report'))

    fireEvent.click(view.getByRole('button', { name: 'Start another assessment' }))
    const sectionHeading = await view.findByRole('heading', {
      level: 2,
      name: 'Stage and architecture',
    })
    await waitFor(() => expect(document.activeElement).toBe(sectionHeading))
    expect(view.getByRole('heading', { level: 1 }).textContent).toContain(
      'Find the gate before it becomes the incident.',
    )
  })

  it('hydrates static query parameters and remounts when they change', async () => {
    navigationState.query = 'profile=payments&next=architecture-diagnostic&checkout=canceled'
    const view = render(
      <ReadinessInteractive
        assessmentEndpoint="https://api.example.test/api/readiness/assess"
        diagnosticEndpoint="https://api.example.test/api/diagnostics/requests"
      />,
    )

    expect(
      view.getByRole('button', { name: /^Payments product/ }).getAttribute('aria-pressed'),
    ).toBe('true')
    expect(view.getByRole('note')).toBeTruthy()
    const canceledHeading = view.getByRole('heading', { name: 'No charge was made.' })
    expect(canceledHeading).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(canceledHeading))

    navigationState.query = 'profile=custom'
    view.rerender(
      <ReadinessInteractive
        assessmentEndpoint="https://api.example.test/api/readiness/assess"
        diagnosticEndpoint="https://api.example.test/api/diagnostics/requests"
      />,
    )

    expect(view.getByRole('button', { name: /^Something else/ }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(view.queryByRole('note')).toBeNull()
    expect(view.queryByRole('heading', { name: 'No charge was made.' })).toBeNull()
  })
})

describe('diagnostic Stripe redirect validation', () => {
  it.each([
    'http://checkout.stripe.com/pay',
    'https://checkout.stripe.com.attacker.example/pay',
    'https://user:password@checkout.stripe.com/pay',
    'javascript:alert(1)',
  ])('rejects %s', (value) => {
    expect(safeDiagnosticCheckoutURL(value)).toBeNull()
  })

  it('normalizes an exact Stripe Checkout host', () => {
    expect(safeDiagnosticCheckoutURL('https://checkout.stripe.com/c/pay_123')).toBe(
      'https://checkout.stripe.com/c/pay_123',
    )
  })
})
