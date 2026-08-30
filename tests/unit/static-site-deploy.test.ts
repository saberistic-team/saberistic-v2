import { describe, expect, it, vi } from 'vitest'

import { triggerStaticSiteDeploy } from '@/lib/staticSiteDeploy'

const hookURL = 'https://api.render.com/deploy/srv-static-site?key=super-secret-hook-key'

function logger() {
  return { info: vi.fn(), warn: vi.fn() }
}

describe('Render static site deploy hook', () => {
  it('queues a rebuild with POST and accepts an asynchronous response', async () => {
    const log = logger()
    const fetchImpl = vi.fn(async () => new Response(null, { status: 202 }))

    await expect(
      triggerStaticSiteDeploy({
        fetchImpl: fetchImpl as unknown as typeof fetch,
        hookURL,
        logger: log,
      }),
    ).resolves.toBe('queued')

    expect(fetchImpl).toHaveBeenCalledWith(
      new URL(hookURL),
      expect.objectContaining({ method: 'POST', redirect: 'error' }),
    )
    expect(JSON.stringify(log.info.mock.calls)).not.toContain('super-secret-hook-key')
    expect(log.warn).not.toHaveBeenCalled()
  })

  it('keeps publishing fail-soft and never logs the secret URL', async () => {
    const log = logger()
    const fetchImpl = vi.fn(async () => {
      throw new Error(`Network failure for ${hookURL}`)
    })

    await expect(
      triggerStaticSiteDeploy({
        fetchImpl: fetchImpl as unknown as typeof fetch,
        hookURL,
        logger: log,
        timeoutMs: 50,
      }),
    ).resolves.toBe('failed')

    expect(JSON.stringify(log.warn.mock.calls)).not.toContain('super-secret-hook-key')
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Error', message: expect.stringContaining('failed') }),
    )
  })

  it('rejects non-Render and non-HTTPS hook addresses before making a request', async () => {
    const log = logger()
    const fetchImpl = vi.fn()

    await expect(
      triggerStaticSiteDeploy({
        fetchImpl: fetchImpl as unknown as typeof fetch,
        hookURL: 'https://example.com/deploy/srv?key=secret',
        logger: log,
      }),
    ).resolves.toBe('failed')

    expect(fetchImpl).not.toHaveBeenCalled()
    expect(log.warn).toHaveBeenCalledOnce()
  })
})
