import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "diagnostic_requests_report_id_idx";
  CREATE UNIQUE INDEX "diagnostic_requests_report_id_idx" ON "diagnostic_requests" USING btree ("report_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "diagnostic_requests_report_id_idx";
  CREATE INDEX "diagnostic_requests_report_id_idx" ON "diagnostic_requests" USING btree ("report_id");`)
}
