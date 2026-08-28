import { expect, test } from '@playwright/test'

test.describe('Payload admin smoke', () => {
  test('serves an anonymous admin entry point without a seeded user', async ({ page }) => {
    const response = await page.goto('/admin')

    expect(response).not.toBeNull()
    expect(response!.status()).toBeLessThan(500)
    await expect(page).toHaveURL(/\/admin(?:\/(?:login|create-first-user))?\/?(?:\?.*)?$/)
    await expect(page.locator('body')).toBeVisible()
  })
})
