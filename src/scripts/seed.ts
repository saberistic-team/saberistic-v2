import 'dotenv/config'

import { getPayload } from 'payload'

import { seedPreparedContent, type SeedPayload } from '../lib/seedPreparedContent'
import config from '../payload.config'

const log = (message: string) => process.stdout.write(`${message}\n`)

const bootstrapAdmin = async (payload: SeedPayload) => {
  const email = process.env.PAYLOAD_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.PAYLOAD_ADMIN_PASSWORD

  if (!email && !password) return
  if (!email || !password) {
    throw new Error('Set both PAYLOAD_ADMIN_EMAIL and PAYLOAD_ADMIN_PASSWORD, or neither.')
  }
  if (password.length < 16) {
    throw new Error('PAYLOAD_ADMIN_PASSWORD must contain at least 16 characters.')
  }

  const result = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: {
      email: {
        equals: email,
      },
    },
  })
  const existing = result.docs[0]

  if (existing) {
    if (existing.role !== 'admin') {
      throw new Error('The bootstrap email already exists but is not an administrator.')
    }

    log('Administrator already exists; credentials were not changed.')
    return
  }

  await payload.create({
    collection: 'users',
    context: { allowRoleBootstrap: true },
    data: {
      email,
      name: 'Saberistic Administrator',
      password,
      role: 'admin',
    },
    overrideAccess: true,
  })
  log('Created the environment-configured administrator.')
}

const main = async () => {
  const payload = (await getPayload({ config })) as unknown as SeedPayload
  const canonicalOrigin =
    process.env.PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    process.env.RENDER_EXTERNAL_URL?.trim() ||
    'http://localhost:3000'

  await bootstrapAdmin(payload)
  await seedPreparedContent({
    canonicalOrigin,
    payload,
    publicConcepts: process.env.SEED_PUBLIC_CONCEPTS === 'true',
  })

  log('Seed complete. No startup auto-seeding is configured.')
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown seed failure.'
    process.stderr.write(`Seed failed: ${message}\n`)
    process.exit(1)
  })
