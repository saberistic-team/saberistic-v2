#!/usr/bin/env node

const endpoints = [
  {
    healthy: (body) => body?.status === 'ready',
    name: 'Saberistic website',
    url: 'https://saberistic.com/api/ready',
  },
  {
    healthy: (body) => body?.ok === true,
    name: 'Umami analytics',
    // The stable Render URL wakes the same service even while custom-domain TLS is propagating.
    url: 'https://saberistic-umami-staging.onrender.com/api/heartbeat',
  },
]

const retryDelayMs = 5_000
const maximumAttempts = 36
const demoIntervalMs = 10 * 60_000
const maximumDemoMinutes = 120

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

const parseDemoMinutes = (arguments_) => {
  const index = arguments_.lastIndexOf('--minutes')

  if (index === -1) return 0

  const value = Number(arguments_[index + 1])

  if (!Number.isInteger(value) || value < 1 || value > maximumDemoMinutes) {
    throw new Error(`--minutes must be an integer from 1 to ${maximumDemoMinutes}.`)
  }

  return value
}

const requestEndpoint = async (endpoint) => {
  const response = await fetch(endpoint.url, {
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      'user-agent': 'saberistic-local-demo-warmup/1.0',
    },
    signal: AbortSignal.timeout(10_000),
  })
  const body = await response.json().catch(() => null)

  if (!response.ok || !endpoint.healthy(body)) {
    throw new Error(`unexpected response (${response.status})`)
  }
}

const warmEndpoint = async (endpoint) => {
  let lastError

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      await requestEndpoint(endpoint)
      console.log(`${new Date().toISOString()} ${endpoint.name}: ready`)
      return
    } catch (error) {
      lastError = error

      if (attempt < maximumAttempts) await delay(retryDelayMs)
    }
  }

  const detail = lastError instanceof Error ? lastError.message : 'unknown error'
  throw new Error(`${endpoint.name} did not become ready: ${detail}`)
}

const warmAll = async () => {
  const results = await Promise.allSettled(endpoints.map(warmEndpoint))
  const failures = results.filter((result) => result.status === 'rejected')

  if (failures.length > 0) {
    throw new AggregateError(
      failures.map((failure) => failure.reason),
      'One or more Render services did not become ready.',
    )
  }
}

const showHelp = () => {
  console.log(`Usage:
  pnpm render:warm
      Wake both services once and wait until they are ready.

  pnpm render:demo -- --minutes 90
      Keep both services warm for a time-bounded demo (1-${maximumDemoMinutes} minutes).

This helper is deliberately time-bounded. It is not a permanent Free-tier uptime daemon.`)
}

const main = async () => {
  if (process.argv.includes('--help')) {
    showHelp()
    return
  }

  const demoMinutes = parseDemoMinutes(process.argv.slice(2))

  if (demoMinutes === 0) {
    await warmAll()
    return
  }

  const endsAt = Date.now() + demoMinutes * 60_000
  console.log(
    `Warming the two Free services for ${demoMinutes} minute(s). This consumes two Free instance-hours per wall-clock hour while both are running.`,
  )

  while (Date.now() < endsAt) {
    await warmAll()

    const remaining = endsAt - Date.now()
    if (remaining <= 0) break

    await delay(Math.min(demoIntervalMs, remaining))
  }

  console.log('Demo warm-up window ended. Render may spin the services down after inactivity.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
