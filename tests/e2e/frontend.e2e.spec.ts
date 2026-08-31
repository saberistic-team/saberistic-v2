import { expect, test } from '@playwright/test'

test.describe('Public site smoke', () => {
  for (const route of [
    '/',
    '/prototypes',
    '/build-notes',
    '/build-notes/cryptopal-wallet-email-wallet',
    '/build-notes/growth-program-sensor-scorecards-devnet',
    '/build-notes/growth-program-v2-scorecards',
    '/build-notes/harness-durable-control-plane-m4',
    '/build-notes/harness-eval-credibility-m2',
    '/build-notes/harness-from-scratch',
    '/build-notes/harness-operator-loop-m1',
    '/build-notes/harness-permissioned-agent-services-m3',
    '/build-notes/spiral-safe-passkey-signing-platform',
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

  test('Harness M4 keeps durable recovery separate from production scale', async ({ page }) => {
    const response = await page.goto('/build-notes/harness-durable-control-plane-m4')
    expect(response?.ok()).toBe(true)

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Harness Platform M4: preserving agent-run state through failure',
      }),
    ).toBeVisible()
    await expect(page.locator('.build-note__facts code')).toHaveText('d3b2859')
    await expect(page.getByRole('link', { name: 'Fenced scheduling' })).toHaveAttribute(
      'href',
      '#scheduling',
    )
    await expect(page.getByRole('link', { name: 'Session restore' })).toHaveAttribute(
      'href',
      '#durable-sessions',
    )
    await expect(page.getByText('PRODUCTION-SHAPED, NOT PRODUCTION-PROVEN')).toBeVisible()
    await expect(page.getByText('No live scale claim', { exact: true })).toBeVisible()
  })

  test('Harness M3 keeps permissioning fail-closed and live provider and Docker proof open', async ({
    page,
  }) => {
    const response = await page.goto('/build-notes/harness-permissioned-agent-services-m3')
    expect(response?.ok()).toBe(true)

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Harness Platform M3: putting permission around the agent loop',
      }),
    ).toBeVisible()
    await expect(page.locator('.build-note__facts code')).toHaveText('defbf7b')
    await expect(page.getByRole('link', { name: 'Permission handshake' })).toHaveAttribute(
      'href',
      '#permission-loop',
    )
    await expect(page.getByRole('link', { name: 'Docker-per-run boundary' })).toHaveAttribute(
      'href',
      '#sandbox',
    )
    await expect(page.getByText('Streaming means events, not model tokens')).toBeVisible()
    await expect(page.getByText('No live stack', { exact: true })).toBeVisible()
  })

  test('Harness M2 keeps telemetry opt-in and live MCP outside the default lane', async ({
    page,
  }) => {
    const response = await page.goto('/build-notes/harness-eval-credibility-m2')
    expect(response?.ok()).toBe(true)

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Harness Platform M2: making evaluation evidence credible',
      }),
    ).toBeVisible()
    await expect(page.locator('.build-note__facts code')).toHaveText('8f18f6d')
    await expect(page.getByRole('link', { name: 'Golden repository' })).toHaveAttribute(
      'href',
      '#golden-repository',
    )
    await expect(page.getByRole('link', { name: 'OpenTelemetry bridge' })).toHaveAttribute(
      'href',
      '#telemetry',
    )
    await expect(page.getByRole('link', { name: 'Live MCP client' })).toHaveAttribute(
      'href',
      '#mcp-stdio',
    )
    await expect(
      page.getByText('never runs in the default pull-request or push lane', { exact: false }),
    ).toBeVisible()
  })

  test('Growth Program keeps the hosted and local-validator demos separate', async ({ page }) => {
    const response = await page.goto('/build-notes/growth-program-v2-scorecards')
    expect(response?.ok()).toBe(true)

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Growth Program v2: replacing a live score contract without mutating it',
      }),
    ).toBeVisible()
    await expect(page.getByText('d944ee7', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Browser-local playground' })).toHaveAttribute(
      'href',
      '#browser-demo',
    )
    await expect(page.getByRole('link', { name: 'Local-validator lab' })).toHaveAttribute(
      'href',
      '#local-validator',
    )
    await expect(
      page.getByText('implemented and locally validated. It is not deployed or release-ready.'),
    ).toBeVisible()
  })

  test('Growth Program devnet keeps sensor evidence and deployment approval separate', async ({
    page,
  }) => {
    const response = await page.goto('/build-notes/growth-program-sensor-scorecards-devnet')
    expect(response?.ok()).toBe(true)

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Growth Program: taking sensor-backed scorecards to Solana devnet',
      }),
    ).toBeVisible()
    await expect(page.locator('.build-note__facts code')).toHaveText('3497678')
    await expect(page.getByRole('link', { name: 'Sensor evidence' })).toHaveAttribute(
      'href',
      '#telemetry-pipeline',
    )
    await expect(page.getByRole('link', { name: 'Executable proof' })).toHaveAttribute(
      'href',
      '#artifact-proof',
    )
    await expect(page.getByText('NO-GO beyond experimental devnet', { exact: true })).toBeVisible()
    await expect(
      page.getByText('The program is on devnet. The hosted playground still cannot touch it.'),
    ).toBeVisible()
  })

  test('Spiral Safe separates fixture walkthroughs from production custody claims', async ({
    page,
  }) => {
    const response = await page.goto('/build-notes/spiral-safe-passkey-signing-platform')
    expect(response?.ok()).toBe(true)

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Spiral Safe: rebuilding a passkey-gated signing platform across eight repositories',
      }),
    ).toBeVisible()
    await expect(page.getByText('8 pinned commits', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'WebAuthn bridge' })).toHaveAttribute(
      'href',
      '#webauthn',
    )
    await expect(page.getByRole('link', { name: 'Veil and Nitro' })).toHaveAttribute(
      'href',
      '#veil-nitro',
    )
    await expect(page.locator('video')).toHaveCount(4)
    const extensionWalkthrough = page.getByLabel(
      'Actual unpacked extension demo fixture walkthrough',
    )
    await expect(extensionWalkthrough).toHaveAttribute('preload', 'none')
    await expect(extensionWalkthrough).toHaveAttribute(
      'aria-describedby',
      'extension-demo-caption extension-demo-transcript-summary',
    )
    await expect(page.getByRole('link', { name: 'Download the WebM', exact: true })).toHaveCount(4)
    await expect(
      page.getByText(
        'The fixture sees a bearer header; it does not prove production API-key authentication.',
      ),
    ).toBeVisible()
    await expect(page.getByText('No EIF was created', { exact: false })).toBeVisible()
  })

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
