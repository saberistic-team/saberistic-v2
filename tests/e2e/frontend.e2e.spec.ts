import { expect, test } from '@playwright/test'

test.describe('Public site smoke', () => {
  for (const route of [
    '/',
    '/prototypes',
    '/build-notes',
    '/build-notes/cryptopal-wallet-email-wallet',
    '/build-notes/harness-from-scratch',
    '/build-notes/harness-operator-loop-m1',
    '/build-notes/three-lovable-prototypes',
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

  test('CryptoPal exposes a lazy native player and visual transcript', async ({ page }) => {
    const response = await page.goto('/build-notes/cryptopal-wallet-email-wallet')
    expect(response?.ok()).toBe(true)

    const video = page.getByLabel('CryptoPal local private-transfer walkthrough')
    await expect(video).toBeVisible()
    await expect(video).toHaveAttribute('controls', '')
    await expect(video).toHaveAttribute('preload', 'none')
    await expect(video).toHaveAttribute('width', '1440')
    await expect(video).toHaveAttribute('height', '900')
    await expect(video.locator('source')).toHaveAttribute('type', 'video/mp4')
    await expect(video.locator('source')).toHaveAttribute(
      'src',
      '/media/build-notes/cryptopal/cryptopal-private-transfer.cafb08d2.mp4',
    )

    const transcript = page.getByText('Visual transcript for the silent recording')
    await expect(transcript).toBeVisible()
    await transcript.click()
    await expect(page.getByText('There is no voice or audio track.')).toBeVisible()
  })

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
