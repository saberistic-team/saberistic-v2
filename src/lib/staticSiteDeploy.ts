type DeployLogger = {
  info?: (value: unknown) => void
  warn: (value: unknown) => void
}

type TriggerStaticSiteDeployOptions = {
  fetchImpl?: typeof fetch
  hookURL?: string
  logger: DeployLogger
  timeoutMs?: number
}

export type StaticSiteDeployResult = 'failed' | 'not-configured' | 'queued'

function parseRenderDeployHook(value: string | undefined): URL | null {
  const candidate = value?.trim()
  if (!candidate) return null

  try {
    const url = new URL(candidate)
    const isRenderHook =
      url.protocol === 'https:' &&
      url.hostname === 'api.render.com' &&
      url.pathname.startsWith('/deploy/') &&
      Boolean(url.searchParams.get('key')) &&
      !url.username &&
      !url.password

    return isRenderHook ? url : null
  } catch {
    return null
  }
}

export async function triggerStaticSiteDeploy({
  fetchImpl = fetch,
  hookURL = process.env.STATIC_SITE_DEPLOY_HOOK_URL,
  logger,
  timeoutMs = 10_000,
}: TriggerStaticSiteDeployOptions): Promise<StaticSiteDeployResult> {
  if (!hookURL?.trim()) return 'not-configured'

  const url = parseRenderDeployHook(hookURL)
  if (!url) {
    logger.warn({
      message: 'Static site rebuild was not requested because its deploy hook is invalid.',
    })
    return 'failed'
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      redirect: 'error',
      signal: controller.signal,
    })

    if (response.status !== 200 && response.status !== 202) {
      logger.warn({
        message: 'Prototype saved, but the static site rebuild request was rejected.',
        status: response.status,
      })
      return 'failed'
    }

    logger.info?.({ message: 'Static site rebuild queued after public prototype change.' })
    return 'queued'
  } catch (error) {
    logger.warn({
      error: error instanceof Error ? error.name : 'UnknownError',
      message: 'Prototype saved, but the static site rebuild request failed.',
    })
    return 'failed'
  } finally {
    clearTimeout(timeout)
  }
}
