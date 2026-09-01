import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "gift_inventory" (
      "id" varchar(120) PRIMARY KEY NOT NULL,
      "name" varchar(120) NOT NULL,
      "normalized_name" varchar(512) NOT NULL,
      "category" varchar(50) NOT NULL,
      "why_it_fits" varchar(280) NOT NULL,
      "product_description" text NOT NULL,
      "retailer" varchar(80) NOT NULL,
      "source_url" varchar(1000) NOT NULL,
      "original_image_url" varchar(1000) NOT NULL,
      "observed_price_cents" integer NOT NULL,
      "currency" varchar(3) DEFAULT 'usd' NOT NULL,
      "theme_ids" text[] NOT NULL,
      "cached_image_webp" bytea,
      "cached_image_mime" varchar(32),
      "cached_image_sha256" varchar(64),
      "status" varchar(16) DEFAULT 'available' NOT NULL,
      "validation_status" varchar(16) DEFAULT 'pending' NOT NULL,
      "validation_expires_at" timestamp(3) with time zone NOT NULL,
      "last_validation_attempt_at" timestamp(3) with time zone,
      "last_validation_error_code" varchar(80),
      "reservation_key" varchar(64),
      "reservation_expires_at" timestamp(3) with time zone,
      "stripe_checkout_session_id" varchar(255),
      "discovery_fingerprint" varchar(64) NOT NULL,
      "checked_at" timestamp(3) with time zone NOT NULL,
      "sold_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "gift_inventory_currency_check" CHECK ("currency" = 'usd'),
      CONSTRAINT "gift_inventory_price_check" CHECK ("observed_price_cents" BETWEEN 1000 AND 30000),
      CONSTRAINT "gift_inventory_status_check" CHECK ("status" IN ('available', 'reserved', 'sold')),
      CONSTRAINT "gift_inventory_validation_status_check" CHECK ("validation_status" IN ('pending', 'valid', 'stale', 'invalid')),
      CONSTRAINT "gift_inventory_theme_ids_check" CHECK (cardinality("theme_ids") > 0),
      CONSTRAINT "gift_inventory_image_check" CHECK (
        ("cached_image_webp" IS NULL AND "cached_image_mime" IS NULL AND "cached_image_sha256" IS NULL)
        OR
        ("cached_image_webp" IS NOT NULL AND "cached_image_mime" = 'image/webp' AND "cached_image_sha256" ~ '^[a-f0-9]{64}$')
      ),
      CONSTRAINT "gift_inventory_lifecycle_check" CHECK (
        ("status" = 'available' AND "reservation_key" IS NULL AND "reservation_expires_at" IS NULL AND "sold_at" IS NULL)
        OR
        ("status" = 'reserved' AND "reservation_key" IS NOT NULL AND "reservation_expires_at" IS NOT NULL AND "sold_at" IS NULL)
        OR
        ("status" = 'sold' AND "reservation_key" IS NOT NULL AND "reservation_expires_at" IS NULL AND "sold_at" IS NOT NULL)
      )
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "gift_inventory_source_url_idx"
      ON "gift_inventory" ("source_url");
    CREATE UNIQUE INDEX IF NOT EXISTS "gift_inventory_normalized_name_idx"
      ON "gift_inventory" ("normalized_name");
    CREATE UNIQUE INDEX IF NOT EXISTS "gift_inventory_discovery_fingerprint_idx"
      ON "gift_inventory" ("discovery_fingerprint");
    CREATE UNIQUE INDEX IF NOT EXISTS "gift_inventory_stripe_checkout_session_idx"
      ON "gift_inventory" ("stripe_checkout_session_id")
      WHERE "stripe_checkout_session_id" IS NOT NULL;
    CREATE INDEX IF NOT EXISTS "gift_inventory_deal_idx"
      ON "gift_inventory" ("status", "validation_status", "validation_expires_at", "observed_price_cents");
    CREATE INDEX IF NOT EXISTS "gift_inventory_checked_at_idx"
      ON "gift_inventory" ("checked_at");

    CREATE TABLE IF NOT EXISTS "gift_inventory_jobs" (
      "id" bigserial PRIMARY KEY NOT NULL,
      "job_key" varchar(190) NOT NULL,
      "kind" varchar(16) NOT NULL,
      "product_id" varchar(120),
      "budget_id" varchar(32),
      "theme_id" varchar(32),
      "status" varchar(16) DEFAULT 'queued' NOT NULL,
      "attempts" integer DEFAULT 0 NOT NULL,
      "max_attempts" integer DEFAULT 4 NOT NULL,
      "run_after" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "locked_at" timestamp(3) with time zone,
      "locked_by" varchar(120),
      "last_error_code" varchar(80),
      "completed_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "gift_inventory_jobs_kind_check" CHECK ("kind" IN ('discover', 'validate')),
      CONSTRAINT "gift_inventory_jobs_status_check" CHECK ("status" IN ('queued', 'running', 'completed', 'failed')),
      CONSTRAINT "gift_inventory_jobs_attempts_check" CHECK ("attempts" >= 0 AND "max_attempts" BETWEEN 1 AND 10),
      CONSTRAINT "gift_inventory_jobs_product_kind_check" CHECK (
        ("kind" = 'discover' AND "product_id" IS NULL AND "budget_id" IS NOT NULL AND "theme_id" IS NOT NULL)
        OR ("kind" = 'validate' AND "product_id" IS NOT NULL AND "budget_id" IS NULL AND "theme_id" IS NULL)
      ),
      CONSTRAINT "gift_inventory_jobs_budget_check" CHECK (
        "budget_id" IS NULL OR "budget_id" IN ('under_30', '30_to_75', '75_to_150', '150_to_300', 'mixed')
      ),
      CONSTRAINT "gift_inventory_jobs_theme_check" CHECK (
        "theme_id" IS NULL OR "theme_id" IN ('build_fuel', 'desk_life', 'books_ideas', 'off_screen', 'wildcard', 'mixed')
      ),
      CONSTRAINT "gift_inventory_jobs_product_fk" FOREIGN KEY ("product_id")
        REFERENCES "public"."gift_inventory"("id") ON DELETE cascade ON UPDATE no action
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "gift_inventory_jobs_job_key_idx"
      ON "gift_inventory_jobs" ("job_key");
    CREATE INDEX IF NOT EXISTS "gift_inventory_jobs_claim_idx"
      ON "gift_inventory_jobs" ("status", "run_after", "created_at");
    CREATE INDEX IF NOT EXISTS "gift_inventory_jobs_product_idx"
      ON "gift_inventory_jobs" ("product_id", "kind", "status");

    ALTER TABLE "gift_payments"
      ADD COLUMN IF NOT EXISTS "inventory_reservation_id" varchar;
    UPDATE "gift_payments"
      SET "inventory_reservation_id" =
        'gift-reservation-' || md5('legacy-gift-payment:' || "id"::text) ||
        md5('legacy-gift-payment-secondary:' || "id"::text)
      WHERE "inventory_reservation_id" IS NULL;
    ALTER TABLE "gift_payments"
      ALTER COLUMN "inventory_reservation_id" SET NOT NULL;
    DROP INDEX IF EXISTS "gift_payments_inventory_reservation_id_idx";
    CREATE UNIQUE INDEX "gift_payments_inventory_reservation_id_idx"
      ON "gift_payments" ("inventory_reservation_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "gift_payments_inventory_reservation_id_idx";
    ALTER TABLE "gift_payments" DROP COLUMN IF EXISTS "inventory_reservation_id";
    DROP TABLE IF EXISTS "gift_inventory_jobs" CASCADE;
    DROP TABLE IF EXISTS "gift_inventory" CASCADE;
  `)
}
