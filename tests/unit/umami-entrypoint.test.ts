import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const entrypoint = path.join(repositoryRoot, 'ops/umami/entrypoint.mjs')
const dockerfile = path.join(repositoryRoot, 'ops/umami/Dockerfile')
const bootstrapPackage = path.join(repositoryRoot, 'ops/umami/package.json')
const bootstrapLockfile = path.join(repositoryRoot, 'ops/umami/pnpm-lock.yaml')
const renderBlueprint = path.join(repositoryRoot, 'render.yaml')
const entrypointSource = readFileSync(entrypoint, 'utf8')
const dockerfileSource = readFileSync(dockerfile, 'utf8')
const bootstrapPackageSource = readFileSync(bootstrapPackage, 'utf8')
const bootstrapLockfileSource = readFileSync(bootstrapLockfile, 'utf8')
const renderBlueprintSource = readFileSync(renderBlueprint, 'utf8')

describe('Umami container entrypoint', () => {
  it('keeps the upstream container start command after replacing its entrypoint', () => {
    expect(dockerfileSource).toContain('CMD ["sh", "scripts/start-docker.sh"]')
  })

  it('installs a frozen, integrity-pinned bootstrap dependency overlay as root', () => {
    const manifest = JSON.parse(bootstrapPackageSource)

    expect(manifest.dependencies).toEqual({ bcryptjs: '3.0.2', pg: '8.23.0' })
    expect(dockerfileSource).toContain(
      'COPY --chown=root:root ops/umami/package.json ops/umami/pnpm-lock.yaml /opt/saberistic/',
    )
    expect(dockerfileSource).toContain(
      'pnpm install --dir /opt/saberistic --prod --ignore-scripts --frozen-lockfile',
    )
    expect(dockerfileSource).not.toContain('pnpm add')
    expect(bootstrapLockfileSource).toContain('bcryptjs@3.0.2:')
    expect(bootstrapLockfileSource).toContain('pg@8.23.0:')
    expect(bootstrapLockfileSource).toContain('integrity: sha512-')
    expect(dockerfileSource).toContain('USER root')
    expect(dockerfileSource).not.toContain('USER nextjs')
    expect(dockerfileSource).toContain('test "$(id -u nextjs)" = "1001"')
    expect(dockerfileSource).toContain('test "$(id -g nextjs)" = "65533"')
  })

  it('builds runtime URLs for the constant restricted role and both Prisma connections', () => {
    expect(entrypointSource).toContain("const databaseRole = 'saberistic_umami'")
    expect(entrypointSource).toContain('runtimeDatabaseURL.username = databaseRole')
    expect(entrypointSource).toContain("runtimeDatabaseURL.searchParams.set('schema', schema)")
    expect(entrypointSource).toContain('DATABASE_URL: runtimeDatabaseURL.toString()')
    expect(entrypointSource).toContain('DIRECT_DATABASE_URL: runtimeDatabaseURL.toString()')
  })

  it('audits a reused role before changing credentials or schema grants', () => {
    expect(entrypointSource).toContain('const assertRoleIsolation = async (client, roleOid) =>')
    expect(entrypointSource).toContain('unexpected_ownership')
    expect(entrypointSource).toContain('unexpected_acl')
    expect(entrypointSource).toContain('FROM pg_default_acl AS default_acl')
    expect(entrypointSource).toContain('FROM pg_attribute AS attribute')
    expect(entrypointSource).toContain('member.rolname = $1 OR parent.rolname = $1')

    const isolationAudit = entrypointSource.indexOf(
      'await assertRoleIsolation(adminClient, roleOid)',
    )
    const roleMutation = entrypointSource.indexOf(`ALTER ROLE \${quotedRole}`, isolationAudit)
    const schemaCreation = entrypointSource.indexOf(
      'CREATE SCHEMA IF NOT EXISTS \${quotedSchema}',
      isolationAudit,
    )

    expect(isolationAudit).toBeGreaterThan(0)
    expect(roleMutation).toBeGreaterThan(isolationAudit)
    expect(schemaCreation).toBeGreaterThan(roleMutation)
  })

  it('derives the 2FA key without passing bootstrap secrets to the upstream process', () => {
    expect(entrypointSource).toContain('delete childEnvironment.UMAMI_DATABASE_ADMIN_URL')
    expect(entrypointSource).toContain('delete childEnvironment.UMAMI_DATABASE_PASSWORD')
    expect(entrypointSource).toContain('delete childEnvironment.UMAMI_ADMIN_PASSWORD')
    expect(entrypointSource).toContain('delete childEnvironment.UMAMI_TWO_FACTOR_SEED')
    expect(entrypointSource).toContain('TWO_FACTOR_ENCRYPTION_KEY: twoFactorEncryptionKey')
    expect(entrypointSource).toContain(".digest('hex')")
  })

  it('keeps a root supervisor while spawning only the child as the pinned nextjs uid and gid', () => {
    expect(entrypointSource).toContain('process.setgroups([nextjsGroupId])')
    expect(entrypointSource).not.toContain('process.setgid(nextjsGroupId)')
    expect(entrypointSource).not.toContain('process.setuid(nextjsUserId)')
    expect(entrypointSource).toContain('gid: nextjsGroupId')
    expect(entrypointSource).toContain('uid: nextjsUserId')
  })

  it('migrates, renames, and secures the default admin before starting the server', () => {
    expect(entrypointSource).toContain(
      "const administratorId = '41e2b680-648e-4b09-bcd7-3e2b10c06264'",
    )
    expect(entrypointSource).toContain("const administratorUsername = 'saberistic_admin'")
    expect(entrypointSource).toContain('FOR UPDATE')

    const migrationPreflight = entrypointSource.indexOf(
      "await runAsNextjs(process.execPath, ['scripts/check-db.js']",
    )
    const passwordBootstrap = entrypointSource.indexOf('await secureBootstrapAdministrator()')
    const upstreamStart = entrypointSource.indexOf('const child = spawn(command, args')

    expect(migrationPreflight).toBeGreaterThan(0)
    expect(passwordBootstrap).toBeGreaterThan(migrationPreflight)
    expect(upstreamStart).toBeGreaterThan(passwordBootstrap)
  })

  it('keeps the production tracker disabled while generating all bootstrap secrets', () => {
    expect(renderBlueprintSource).toContain('- key: UMAMI_ADMIN_PASSWORD\n')
    expect(renderBlueprintSource).toContain('- key: UMAMI_TWO_FACTOR_SEED\n')
    expect(renderBlueprintSource).not.toContain('UMAMI_WEBSITE_ID')
    expect(renderBlueprintSource).not.toContain('UMAMI_SCRIPT_URL')
    expect(renderBlueprintSource).not.toContain('UMAMI_TRACK_DOMAINS')
  })

  it('rejects an unsafe schema name before starting the upstream command', () => {
    const result = spawnSync(process.execPath, [entrypoint, process.execPath], {
      encoding: 'utf8',
      env: {
        ...process.env,
        UMAMI_DATABASE_ADMIN_URL: 'postgresql://owner:secret@database.internal:5432/saberistic',
        UMAMI_DATABASE_PASSWORD: 'a-secure-generated-password-of-at-least-32-bytes',
        UMAMI_ADMIN_PASSWORD: 'a-secure-generated-admin-password-of-at-least-32-bytes',
        UMAMI_TWO_FACTOR_SEED: 'a-secure-generated-two-factor-seed-of-at-least-32-bytes',
        UMAMI_DATABASE_SCHEMA: 'public;drop schema public',
      },
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('safe PostgreSQL identifier')
    expect(result.stdout).toBe('')
  })
})
