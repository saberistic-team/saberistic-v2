import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up(_args: MigrateUpArgs): Promise<void> {
  // Historical repair marker. The preceding publication migration now runs the repaired,
  // idempotent implementation directly. Replaying that implementation here on a fresh database
  // makes Payload's current schema query relation columns that are intentionally added by later
  // migrations, so this second pass must remain a no-op.
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Intentionally non-destructive: this repair may promote records created by the first migration.
}
