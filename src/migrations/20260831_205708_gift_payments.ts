import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_gift_payments_currency" AS ENUM('usd');
  CREATE TYPE "public"."enum_gift_payments_stripe_event_type" AS ENUM('checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired', 'charge.refunded');
  CREATE TYPE "public"."enum_gift_payments_checkout_status" AS ENUM('open', 'complete', 'expired');
  CREATE TYPE "public"."enum_gift_payments_payment_status" AS ENUM('pending', 'paid', 'partially_refunded', 'refunded', 'failed', 'expired');
  CREATE TYPE "public"."enum_gift_payments_fulfillment_status" AS ENUM('awaiting_review', 'planned', 'ordered', 'fulfilled', 'substituted', 'declined', 'refunded');
  CREATE TABLE "diagnostic_requests_selected_blockers" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"rule_id" varchar NOT NULL,
	"label" varchar NOT NULL
  );

  CREATE TABLE "gift_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"gift_offer_id" varchar NOT NULL,
	"gift_run_id" varchar NOT NULL,
	"item_name" varchar NOT NULL,
	"category" varchar NOT NULL,
	"reference_retailer" varchar NOT NULL,
	"reference_source" varchar NOT NULL,
	"amount_cents" numeric NOT NULL,
	"currency" "enum_gift_payments_currency" NOT NULL,
	"payer_email" varchar,
	"gift_note" varchar,
	"stripe_checkout_session_id" varchar NOT NULL,
	"stripe_payment_intent_id" varchar,
	"stripe_charge_id" varchar,
	"stripe_event_id" varchar NOT NULL,
	"stripe_event_type" "enum_gift_payments_stripe_event_type" NOT NULL,
	"processed_stripe_event_ids" jsonb NOT NULL,
	"checkout_status" "enum_gift_payments_checkout_status" NOT NULL,
	"payment_status" "enum_gift_payments_payment_status" DEFAULT 'pending' NOT NULL,
	"refunded_amount_cents" numeric DEFAULT 0 NOT NULL,
	"checkout_created_at" timestamp(3) with time zone NOT NULL,
	"stripe_event_created_at" timestamp(3) with time zone NOT NULL,
	"payment_confirmed_at" timestamp(3) with time zone,
	"payment_failed_at" timestamp(3) with time zone,
	"checkout_expired_at" timestamp(3) with time zone,
	"refunded_at" timestamp(3) with time zone,
	"retention_review_at" timestamp(3) with time zone NOT NULL,
	"fulfillment_status" "enum_gift_payments_fulfillment_status" DEFAULT 'awaiting_review' NOT NULL,
	"internal_notes" varchar,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "gift_payments_id" integer;
  ALTER TABLE "diagnostic_requests_selected_blockers" ADD CONSTRAINT "diagnostic_requests_selected_blockers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."diagnostic_requests"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "diagnostic_requests_selected_blockers_order_idx" ON "diagnostic_requests_selected_blockers" USING btree ("_order");
  CREATE INDEX "diagnostic_requests_selected_blockers_parent_id_idx" ON "diagnostic_requests_selected_blockers" USING btree ("_parent_id");
  CREATE INDEX "gift_payments_gift_offer_id_idx" ON "gift_payments" USING btree ("gift_offer_id");
  CREATE INDEX "gift_payments_gift_run_id_idx" ON "gift_payments" USING btree ("gift_run_id");
  CREATE UNIQUE INDEX "gift_payments_stripe_checkout_session_id_idx" ON "gift_payments" USING btree ("stripe_checkout_session_id");
  CREATE INDEX "gift_payments_stripe_payment_intent_id_idx" ON "gift_payments" USING btree ("stripe_payment_intent_id");
  CREATE INDEX "gift_payments_stripe_charge_id_idx" ON "gift_payments" USING btree ("stripe_charge_id");
  CREATE INDEX "gift_payments_stripe_event_id_idx" ON "gift_payments" USING btree ("stripe_event_id");
  CREATE INDEX "gift_payments_payment_status_idx" ON "gift_payments" USING btree ("payment_status");
  CREATE INDEX "gift_payments_fulfillment_status_idx" ON "gift_payments" USING btree ("fulfillment_status");
  CREATE INDEX "gift_payments_updated_at_idx" ON "gift_payments" USING btree ("updated_at");
  CREATE INDEX "gift_payments_created_at_idx" ON "gift_payments" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_gift_payments_fk" FOREIGN KEY ("gift_payments_id") REFERENCES "public"."gift_payments"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_gift_payments_id_idx" ON "payload_locked_documents_rels" USING btree ("gift_payments_id");
  INSERT INTO "diagnostic_requests_selected_blockers" ("_order", "_parent_id", "id", "rule_id", "label")
  SELECT
    blocker.ordinality - 1,
    request."id",
    COALESCE(NULLIF(blocker.value ->> 'id', ''), 'migrated-' || request."id"::text || '-' || blocker.ordinality::text),
    blocker.value ->> 'ruleId',
    blocker.value ->> 'label'
  FROM "diagnostic_requests" AS request
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(request."selected_blockers", '[]'::jsonb)) WITH ORDINALITY AS blocker(value, ordinality)
  WHERE
    jsonb_typeof(blocker.value) = 'object'
    AND NULLIF(blocker.value ->> 'ruleId', '') IS NOT NULL
    AND NULLIF(blocker.value ->> 'label', '') IS NOT NULL;
  ALTER TABLE "diagnostic_requests" DROP COLUMN "selected_blockers";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_gift_payments_fk";
  DROP INDEX "payload_locked_documents_rels_gift_payments_id_idx";
  ALTER TABLE "diagnostic_requests" ADD COLUMN "selected_blockers" jsonb;
  UPDATE "diagnostic_requests" AS request
  SET "selected_blockers" = blockers.value
  FROM (
    SELECT
      "_parent_id",
      jsonb_agg(
        jsonb_build_object('id', "id", 'ruleId', "rule_id", 'label', "label")
        ORDER BY "_order"
      ) AS value
    FROM "diagnostic_requests_selected_blockers"
    GROUP BY "_parent_id"
  ) AS blockers
  WHERE request."id" = blockers."_parent_id";
  ALTER TABLE "diagnostic_requests_selected_blockers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gift_payments" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "diagnostic_requests_selected_blockers" CASCADE;
  DROP TABLE "gift_payments" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "gift_payments_id";
  DROP TYPE "public"."enum_gift_payments_currency";
  DROP TYPE "public"."enum_gift_payments_stripe_event_type";
  DROP TYPE "public"."enum_gift_payments_checkout_status";
  DROP TYPE "public"."enum_gift_payments_payment_status";
  DROP TYPE "public"."enum_gift_payments_fulfillment_status";`)
}
