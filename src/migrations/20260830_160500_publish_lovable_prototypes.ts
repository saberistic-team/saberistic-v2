import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

import {
  publishLovablePrototypes,
  type LovablePrototypePayload,
} from '../lib/publishLovablePrototypes'

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  await publishLovablePrototypes({
    payload: payload as unknown as LovablePrototypePayload,
    req,
  })
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Intentionally non-destructive: published editorial records and their evidence may be edited later.
}
