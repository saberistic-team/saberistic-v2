import { expect, test } from '@playwright/test'

test.describe('Public site smoke', () => {
  for (const route of [
    '/',
    '/prototypes',
    '/build-notes',
    '/build-notes/harness-from-scratch',
    '/build-notes/turbopass-rust-temporal',
  ]) {
    test(`${route} renders without seeded content`, async ({ page }) => {
      const response = await page.goto(route)

      expect(response).not.toBeNull()
      expect(response!.ok()).toBe(true)
      await expect(page.locator('main')).toBeVisible()
      await expect(page.locator('h1').first()).toBeVisible()
    })
  }

  test('/api/health is a cache-safe, non-sensitive liveness response', async ({ request }) => {
    const response = await request.get('/api/health')

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('application/json')
    expect(response.headers()['cache-control']).toContain('no-store')

    const body = (await response.json()) as Record<string, unknown>

    expect(body).toMatchObject({ status: 'ok' })
    expect(Object.keys(body).every((key) => ['commit', 'service', 'status'].includes(key))).toBe(
      true,
    )
    expect(Object.keys(body).some((key) => /secret|token|password|database/i.test(key))).toBe(false)
  })
})
