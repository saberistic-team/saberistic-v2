import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Retire the retailer-backed inventory contract before generated concepts are admitted.
 *
 * Closing every legacy job first fences any old worker that still holds a discovery or validation
 * lease during a rolling deploy. The inventory rows and cached artwork remain in place at cutover
 * for payment history and audit; normal retention may later clear expired image bytes. Only unsold
 * rows are removed from future deals.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "gift_inventory_jobs"
    SET "status" = 'failed',
        "locked_at" = NULL,
        "locked_by" = NULL,
        "last_error_code" = CASE
          WHEN "kind" = 'validate' THEN 'retailer_validation_retired'
          ELSE 'retailer_discovery_retired'
        END,
        "completed_at" = now(),
        "updated_at" = now()
    WHERE "kind" IN ('discover', 'validate')
      AND "status" IN ('queued', 'running');

    UPDATE "gift_inventory"
    SET "validation_status" = 'invalid',
        "validation_expires_at" = now(),
        "last_validation_attempt_at" = now(),
        "last_validation_error_code" = 'retailer_inventory_retired',
        "updated_at" = now()
    WHERE "status" <> 'sold';
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error(
    'generated_gift_inventory_cutover_is_forward_only: prior validation states cannot be reconstructed safely',
  )
}
