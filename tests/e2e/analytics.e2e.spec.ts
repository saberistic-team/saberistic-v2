import { expect, test, type Request } from '@playwright/test'

type UmamiEnvelope = {
  payload?: Record<string, unknown>
  type?: string
}

function readEnvelope(request: Request): UmamiEnvelope | null {
  const body = request.postData()

  if (!body) return null

  try {
    return JSON.parse(body) as UmamiEnvelope
  } catch {
    return null
  }
}

function isUmamiSend(request: Request) {
  return request.url() === 'https://umami.saberistic.com/api/send'
}

test.describe('Live Umami acceptance', () => {
  test.skip(
    process.env.LIVE_ANALYTICS_ACCEPTANCE !== 'true',
    'Runs deliberately against the deployed production-domain tracker only.',
  )

  test('delivers a sanitized pageview and allowlisted CTA event', async ({ page }) => {
    const pageviewRequestPromise = page.waitForRequest((request) => {
      const envelope = readEnvelope(request)

      return (
        isUmamiSend(request) &&
        envelope?.type === 'event' &&
        envelope.payload?.name === undefined &&
        envelope.payload?.url === '/'
      )
    })

    const response = await page.goto('/?campaign=analytics-acceptance#privacy-guard')

    expect(response?.ok()).toBe(true)

    const tracker = page.locator('#umami-analytics')
    await expect(tracker).toHaveAttribute('src', 'https://umami.saberistic.com/script.js')
    await expect(tracker).toHaveAttribute('data-website-id', '8bdad921-34a9-43cb-bc70-9e1c71efa911')
    await expect(tracker).toHaveAttribute('data-domains', 'saberistic.com,www.saberistic.com')
    await expect(tracker).toHaveAttribute('data-before-send', 'saberisticUmamiBeforeSend')
    await expect(tracker).toHaveAttribute('data-do-not-track', 'true')
    await expect(tracker).toHaveAttribute('data-exclude-search', 'true')
    await expect(tracker).toHaveAttribute('data-exclude-hash', 'true')

    const pageviewRequest = await pageviewRequestPromise
    const pageviewEnvelope = readEnvelope(pageviewRequest)
    const pageviewResponse = await pageviewRequest.response()

    expect(pageviewResponse?.status()).toBe(200)
    expect(pageviewEnvelope?.payload?.url).toBe('/')
    expect(pageviewRequest.postData()).not.toContain('analytics-acceptance')
    expect(pageviewRequest.postData()).not.toContain('privacy-guard')

    const eventRequestPromise = page.waitForRequest((request) => {
      const envelope = readEnvelope(request)

      return (
        isUmamiSend(request) &&
        envelope?.type === 'event' &&
        envelope.payload?.name === 'primary_cta_clicked'
      )
    })

    await page.getByRole('link', { exact: true, name: 'Explore prototypes' }).click()

    const eventRequest = await eventRequestPromise
    const eventEnvelope = readEnvelope(eventRequest)
    const eventResponse = await eventRequest.response()

    expect(eventResponse?.status()).toBe(200)
    expect(eventEnvelope?.payload).toMatchObject({
      data: { cta: 'explore_prototypes', placement: 'home_hero' },
      name: 'primary_cta_clicked',
      url: '/',
    })
    expect(eventRequest.postData()).not.toContain('campaign')
    await expect(page).toHaveURL(/\/prototypes$/)
  })
})
