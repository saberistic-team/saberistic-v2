import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

import { seedPreparedContent, type SeedPayload } from '../lib/seedPreparedContent'

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  await seedPreparedContent({
    canonicalOrigin: 'https://saberistic.com',
    payload: payload as unknown as SeedPayload,
    publicConcepts: false,
    req,
  })
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Intentionally non-destructive: these editorial records may be reviewed or edited after launch.
}
