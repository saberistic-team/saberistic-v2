import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_diagnostic_requests_request_type" AS ENUM('architecture_diagnostic');
  CREATE TYPE "public"."enum_diagnostic_requests_readiness_level" AS ENUM('demo_only', 'internal_beta', 'limited_production', 'production_candidate');
  CREATE TYPE "public"."enum_diagnostic_requests_timeframe" AS ENUM('this_week', 'next_two_weeks', 'this_month');
  CREATE TYPE "public"."enum_diagnostic_requests_time_band" AS ENUM('morning', 'afternoon', 'flexible');
  CREATE TYPE "public"."enum_diagnostic_requests_workflow_status" AS ENUM('new', 'reviewed', 'replied', 'archived');
  CREATE TYPE "public"."enum_diagnostic_requests_payment_status" AS ENUM('pending', 'paid', 'failed', 'refunded');
  CREATE TYPE "public"."enum_diagnostic_requests_booking_status" AS ENUM('awaiting_payment', 'awaiting_selection', 'scheduled', 'completed', 'canceled');
  CREATE TABLE "diagnostic_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" varchar NOT NULL,
	"submission_key" varchar NOT NULL,
	"request_type" "enum_diagnostic_requests_request_type" DEFAULT 'architecture_diagnostic' NOT NULL,
	"name" varchar NOT NULL,
	"email" varchar NOT NULL,
	"company" varchar,
	"additional_context" varchar,
	"report_id" varchar NOT NULL,
	"policy_version" varchar NOT NULL,
	"readiness_level" "enum_diagnostic_requests_readiness_level" NOT NULL,
	"share_assessment_summary" boolean DEFAULT false NOT NULL,
	"selected_blockers" jsonb,
	"contact_consent" boolean DEFAULT false NOT NULL,
	"consented_at" timestamp(3) with time zone NOT NULL,
	"privacy_notice_version" varchar NOT NULL,
	"timeframe" "enum_diagnostic_requests_timeframe" NOT NULL,
	"time_band" "enum_diagnostic_requests_time_band" NOT NULL,
	"time_zone" varchar NOT NULL,
	"workflow_status" "enum_diagnostic_requests_workflow_status" DEFAULT 'new' NOT NULL,
	"payment_status" "enum_diagnostic_requests_payment_status" DEFAULT 'pending' NOT NULL,
	"booking_status" "enum_diagnostic_requests_booking_status" DEFAULT 'awaiting_payment' NOT NULL,
	"stripe_checkout_session_id" varchar,
	"stripe_payment_intent_id" varchar,
	"stripe_event_id" varchar,
	"customer_report_email_id" varchar,
	"internal_notification_email_id" varchar,
	"customer_confirmation_email_id" varchar,
	"paid_notification_email_id" varchar,
	"customer_report_sent_at" timestamp(3) with time zone,
	"internal_notification_sent_at" timestamp(3) with time zone,
	"payment_confirmed_at" timestamp(3) with time zone,
	"customer_confirmation_sent_at" timestamp(3) with time zone,
	"paid_notification_sent_at" timestamp(3) with time zone,
	"retention_review_at" timestamp(3) with time zone NOT NULL,
	"internal_notes" varchar,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "diagnostic_requests_id" integer;
  CREATE UNIQUE INDEX "diagnostic_requests_request_id_idx" ON "diagnostic_requests" USING btree ("request_id");
  CREATE UNIQUE INDEX "diagnostic_requests_submission_key_idx" ON "diagnostic_requests" USING btree ("submission_key");
  CREATE INDEX "diagnostic_requests_request_type_idx" ON "diagnostic_requests" USING btree ("request_type");
  CREATE INDEX "diagnostic_requests_report_id_idx" ON "diagnostic_requests" USING btree ("report_id");
  CREATE INDEX "diagnostic_requests_workflow_status_idx" ON "diagnostic_requests" USING btree ("workflow_status");
  CREATE INDEX "diagnostic_requests_payment_status_idx" ON "diagnostic_requests" USING btree ("payment_status");
  CREATE INDEX "diagnostic_requests_booking_status_idx" ON "diagnostic_requests" USING btree ("booking_status");
  CREATE UNIQUE INDEX "diagnostic_requests_stripe_checkout_session_id_idx" ON "diagnostic_requests" USING btree ("stripe_checkout_session_id");
  CREATE INDEX "diagnostic_requests_updated_at_idx" ON "diagnostic_requests" USING btree ("updated_at");
  CREATE INDEX "diagnostic_requests_created_at_idx" ON "diagnostic_requests" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_diagnostic_requests_fk" FOREIGN KEY ("diagnostic_requests_id") REFERENCES "public"."diagnostic_requests"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_diagnostic_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("diagnostic_requests_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_diagnostic_requests_fk";
  DROP INDEX "payload_locked_documents_rels_diagnostic_requests_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "diagnostic_requests_id";
  ALTER TABLE "diagnostic_requests" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "diagnostic_requests" CASCADE;
  DROP TYPE "public"."enum_diagnostic_requests_request_type";
  DROP TYPE "public"."enum_diagnostic_requests_readiness_level";
  DROP TYPE "public"."enum_diagnostic_requests_timeframe";
  DROP TYPE "public"."enum_diagnostic_requests_time_band";
  DROP TYPE "public"."enum_diagnostic_requests_workflow_status";
  DROP TYPE "public"."enum_diagnostic_requests_payment_status";
  DROP TYPE "public"."enum_diagnostic_requests_booking_status";`)
}
