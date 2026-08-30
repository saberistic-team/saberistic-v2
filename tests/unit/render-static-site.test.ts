import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const blueprint = readFileSync(path.join(repositoryRoot, 'render.yaml'), 'utf8')
const dailyWorkflow = readFileSync(
  path.join(repositoryRoot, '.github/workflows/static-site-rebuild.yml'),
  'utf8',
)
const staticService = blueprint.slice(
  blueprint.indexOf('name: saberistic-site-staging'),
  blueprint.indexOf('name: saberistic-umami-staging'),
)

describe('Render Static Site Blueprint', () => {
  it('builds the separate remote-content export and publishes only its out directory', () => {
    expect(staticService).toContain('runtime: static')
    expect(staticService).toContain('buildCommand: pnpm build:site')
    expect(staticService).not.toContain('corepack enable')
    expect(staticService).toContain('staticPublishPath: ./apps/site/out')
    expect(staticService).toContain('value: https://saberistic-web-staging.onrender.com')
    expect(staticService).toContain('value: remote')
  })

  it('keeps CMS and analytics secrets out of the public build service', () => {
    expect(staticService).not.toContain('DATABASE_URL')
    expect(staticService).not.toContain('PAYLOAD_SECRET')
    expect(staticService).not.toContain('STATIC_SITE_DEPLOY_HOOK_URL')
    expect(staticService).not.toContain('UMAMI_ADMIN_PASSWORD')
  })

  it('uses real exported routes and redirects only CMS paths to Payload', () => {
    expect(staticService).not.toContain('type: rewrite')
    expect(staticService).toContain('source: /admin/*')
    expect(staticService).toContain('source: /api/*')
    expect(staticService).toContain('name: Content-Security-Policy')
  })

  it('queues a daily refresh without committing the secret hook value', () => {
    expect(dailyWorkflow).toContain("cron: '35 11 * * *'")
    expect(dailyWorkflow).toContain('secrets.STATIC_SITE_DEPLOY_HOOK_URL')
    expect(dailyWorkflow).not.toContain('api.render.com/deploy/')
  })
})
