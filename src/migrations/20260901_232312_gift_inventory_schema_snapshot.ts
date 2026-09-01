import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Payload generated this migration to accompany the current schema snapshot.
 *
 * The preceding hand-written gift-inventory migration already adds the
 * reservation column, gives any historical payment a deterministic legacy
 * reservation identity, and applies the required unique constraint. Repeating
 * the generated ALTER TABLE here would try to add the same column twice.
 */
export async function up(_args: MigrateUpArgs): Promise<void> {
  // Snapshot-only migration; database changes are in 20260901_022500.
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Snapshot-only migration; rollback is handled by 20260901_022500.
}
