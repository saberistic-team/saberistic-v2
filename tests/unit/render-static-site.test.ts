import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const blueprint = readFileSync(path.join(repositoryRoot, 'render.yaml'), 'utf8')
const dockerfile = readFileSync(path.join(repositoryRoot, 'Dockerfile'), 'utf8')
const dailyWorkflow = readFileSync(
  path.join(repositoryRoot, '.github/workflows/static-site-rebuild.yml'),
  'utf8',
)
const staticService = blueprint.slice(
  blueprint.indexOf('name: saberistic-site-staging'),
  blueprint.indexOf('name: saberistic-umami-staging'),
)
const payloadService = blueprint.slice(
  blueprint.indexOf('name: saberistic-web-staging'),
  blueprint.indexOf('name: saberistic-site-staging'),
)

describe('Render Static Site Blueprint', () => {
  it('keeps paid private-network isolation as a production upgrade', () => {
    expect(blueprint).toContain('networking:\n          isolation: disabled')
  })

  it('builds the separate remote-content export and publishes only its out directory', () => {
    expect(staticService).toContain('runtime: static')
    expect(staticService).toContain('buildCommand: pnpm build:site')
    expect(staticService).not.toContain('corepack enable')
    expect(staticService).toContain('staticPublishPath: ./apps/site/out')
    expect(staticService).toContain('domains:\n              - saberistic.com')
    expect(staticService).toContain('renderSubdomainPolicy: disabled')
    expect(staticService).toContain('value: https://saberistic-web-staging.onrender.com')
    expect(staticService).toContain('value: remote')
  })

  it('keeps CMS and analytics secrets out of the public build service', () => {
    expect(staticService).not.toContain('DATABASE_URL')
    expect(staticService).not.toContain('PAYLOAD_SECRET')
    expect(staticService).not.toContain('STATIC_SITE_DEPLOY_HOOK_URL')
    expect(staticService).not.toContain('UMAMI_ADMIN_PASSWORD')
    expect(staticService).not.toContain('OPENROUTER_API_KEY')
    expect(staticService).not.toContain('READINESS_HANDOFF_SECRET')
    expect(staticService).not.toContain('READINESS_RATE_LIMIT_SECRET')
    expect(staticService).not.toContain('REDIS_URL')
  })

  it('keeps the reviewed readiness AI path server-side and rate-limited', () => {
    expect(payloadService).toMatch(/- key: OPENROUTER_API_KEY\n\s+sync: false/)
    expect(payloadService).toMatch(/- key: OPENROUTER_ACCOUNT_GATES_CONFIRMED\n\s+sync: false/)
    expect(payloadService).toMatch(/- key: OPENROUTER_PRIMARY_MODEL\n\s+sync: false/)
    expect(payloadService).toMatch(/- key: OPENROUTER_FALLBACK_MODEL\n\s+sync: false/)
    expect(payloadService).toMatch(/- key: AI_ENHANCEMENT_ENABLED\n\s+value: '1'/)
    expect(payloadService).toMatch(/- key: READINESS_RATE_LIMIT_SECRET\n\s+generateValue: true/)
    expect(payloadService).toContain('name: saberistic-readiness-limits-staging')
    expect(blueprint).toMatch(
      /- type: keyvalue\n\s+name: saberistic-readiness-limits-staging[\s\S]*?maxmemoryPolicy: noeviction/,
    )
  })

  it('declares the externally managed deploy hook only on Payload', () => {
    expect(payloadService).toMatch(/- key: STATIC_SITE_DEPLOY_HOOK_URL\n\s+sync: false/)
    expect(staticService).not.toContain('STATIC_SITE_DEPLOY_HOOK_URL')
  })

  it('uses real exported routes and redirects only CMS paths to Payload', () => {
    expect(staticService).not.toContain('type: rewrite')
    expect(staticService).toContain('source: /admin/*')
    expect(staticService).toContain('source: /api/*')
    expect(staticService).toContain('name: Content-Security-Policy')
    expect(staticService).toContain(
      "connect-src 'self' https://saberistic-web-staging.onrender.com https://umami.saberistic.com",
    )
  })

  it('preserves equivalent legacy URLs and caches committed media safely', () => {
    for (const source of [
      '/about',
      '/brief',
      '/case-studies',
      '/diagnostic',
      '/services',
      '/work/architecture-diagnostic',
      '/work/baxus',
      '/work/brave',
      '/work/eternis',
    ]) {
      expect(staticService).toContain(`source: ${source}`)
    }

    expect(staticService).toContain('path: /brand/*')
    expect(staticService).toContain('max-age=86400, stale-while-revalidate=604800')
    expect(staticService).toContain("media-src 'self'")
    expect(staticService).toContain('path: /media/*')
    expect(staticService).toContain('max-age=31536000, immutable')
    expect(dockerfile).toContain('/app/public ./public')
  })

  it('queues a daily refresh without committing the secret hook value', () => {
    expect(dailyWorkflow).toContain("cron: '35 11 * * *'")
    expect(dailyWorkflow).toContain('secrets.STATIC_SITE_DEPLOY_HOOK_URL')
    expect(dailyWorkflow).not.toContain('api.render.com/deploy/')
  })
})
