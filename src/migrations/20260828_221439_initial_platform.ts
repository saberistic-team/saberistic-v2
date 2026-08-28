import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor');
  CREATE TYPE "public"."enum_media_usage_rights" AS ENUM('owned', 'licensed', 'public-domain', 'third-party-permission');
  CREATE TYPE "public"."enum_media_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__media_v_version_usage_rights" AS ENUM('owned', 'licensed', 'public-domain', 'third-party-permission');
  CREATE TYPE "public"."enum__media_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_evidence_sources_allowed_surfaces" AS ENUM('homepage', 'work', 'about', 'proposal', 'prototype-hub', 'private-only');
  CREATE TYPE "public"."enum_evidence_sources_source_type" AS ENUM('official-product', 'official-company', 'repository', 'commit', 'pull-request', 'package-registry', 'archive', 'resume', 'professional-profile', 'third-party-reference', 'other');
  CREATE TYPE "public"."enum_evidence_sources_strength" AS ENUM('primary', 'first-party-public', 'public-contribution', 'secondary', 'self-attested');
  CREATE TYPE "public"."enum_evidence_sources_permission_status" AS ENUM('public', 'approval-required', 'private-only');
  CREATE TYPE "public"."enum_evidence_sources_verification_status" AS ENUM('proposed', 'verified', 'rejected');
  CREATE TYPE "public"."prototype_lifecycle" AS ENUM('concept', 'prototype', 'alpha', 'beta', 'live', 'archived');
  CREATE TYPE "public"."enum_prototypes_data_classification" AS ENUM('none', 'synthetic-only', 'non-sensitive', 'account-data', 'sensitive');
  CREATE TYPE "public"."enum_prototypes_source_provenance_relation" AS ENUM('organization_owned', 'personal_original', 'fork', 'external_contribution');
  CREATE TYPE "public"."prototype_license" AS ENUM('MIT', 'Apache-2.0', 'PolyForm-Noncommercial-1.0.0', 'NOASSERTION', 'OTHER-REVIEWED');
  CREATE TYPE "public"."prototype_source_review" AS ENUM('unreviewed', 'metadata_only', 'reviewed', 'blocked');
  CREATE TYPE "public"."enum_prototypes_availability_status" AS ENUM('unchecked', 'available', 'degraded', 'unavailable', 'retired');
  CREATE TYPE "public"."enum_prototypes_launch_approval" AS ENUM('not-reviewed', 'approved', 'blocked');
  CREATE TYPE "public"."enum_prototypes_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__prototypes_v_version_data_classification" AS ENUM('none', 'synthetic-only', 'non-sensitive', 'account-data', 'sensitive');
  CREATE TYPE "public"."enum__prototypes_v_version_source_provenance_relation" AS ENUM('organization_owned', 'personal_original', 'fork', 'external_contribution');
  CREATE TYPE "public"."enum__prototypes_v_version_availability_status" AS ENUM('unchecked', 'available', 'degraded', 'unavailable', 'retired');
  CREATE TYPE "public"."enum__prototypes_v_version_launch_approval" AS ENUM('not-reviewed', 'approved', 'blocked');
  CREATE TYPE "public"."enum__prototypes_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_site_settings_social_links_platform" AS ENUM('github', 'linkedin', 'other');
  CREATE TYPE "public"."enum_site_settings_default_primary_action_id" AS ENUM('check_production_readiness', 'explore_prototypes', 'start_architecture_diagnostic', 'inquire_prototype_to_production', 'inquire_engineering_rescue', 'inquire_fractional_principal_engineer');
  CREATE TYPE "public"."enum_site_settings_default_secondary_action_id" AS ENUM('check_production_readiness', 'explore_prototypes', 'start_architecture_diagnostic', 'inquire_prototype_to_production', 'inquire_engineering_rescue', 'inquire_fractional_principal_engineer');
  CREATE TABLE "users_sessions" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "created_at" timestamp(3) with time zone,
    "expires_at" timestamp(3) with time zone NOT NULL
  );

  CREATE TABLE "users" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar NOT NULL,
    "role" "enum_users_role" DEFAULT 'editor' NOT NULL,
    "last_security_review_at" timestamp(3) with time zone,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "email" varchar NOT NULL,
    "reset_password_token" varchar,
    "reset_password_expiration" timestamp(3) with time zone,
    "salt" varchar,
    "hash" varchar,
    "login_attempts" numeric DEFAULT 0,
    "lock_until" timestamp(3) with time zone
  );

  CREATE TABLE "media" (
    "id" serial PRIMARY KEY NOT NULL,
    "alt" varchar,
    "caption" varchar,
    "credit" varchar,
    "source_url" varchar,
    "usage_rights" "enum_media_usage_rights",
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "_status" "enum_media_status" DEFAULT 'draft',
    "url" varchar,
    "thumbnail_u_r_l" varchar,
    "filename" varchar,
    "mime_type" varchar,
    "filesize" numeric,
    "width" numeric,
    "height" numeric,
    "focal_x" numeric,
    "focal_y" numeric,
    "sizes_thumbnail_url" varchar,
    "sizes_thumbnail_width" numeric,
    "sizes_thumbnail_height" numeric,
    "sizes_thumbnail_mime_type" varchar,
    "sizes_thumbnail_filesize" numeric,
    "sizes_thumbnail_filename" varchar,
    "sizes_card_url" varchar,
    "sizes_card_width" numeric,
    "sizes_card_height" numeric,
    "sizes_card_mime_type" varchar,
    "sizes_card_filesize" numeric,
    "sizes_card_filename" varchar
  );

  CREATE TABLE "_media_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_alt" varchar,
    "version_caption" varchar,
    "version_credit" varchar,
    "version_source_url" varchar,
    "version_usage_rights" "enum__media_v_version_usage_rights",
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version__status" "enum__media_v_version_status" DEFAULT 'draft',
    "version_url" varchar,
    "version_thumbnail_u_r_l" varchar,
    "version_filename" varchar,
    "version_mime_type" varchar,
    "version_filesize" numeric,
    "version_width" numeric,
    "version_height" numeric,
    "version_focal_x" numeric,
    "version_focal_y" numeric,
    "version_sizes_thumbnail_url" varchar,
    "version_sizes_thumbnail_width" numeric,
    "version_sizes_thumbnail_height" numeric,
    "version_sizes_thumbnail_mime_type" varchar,
    "version_sizes_thumbnail_filesize" numeric,
    "version_sizes_thumbnail_filename" varchar,
    "version_sizes_card_url" varchar,
    "version_sizes_card_width" numeric,
    "version_sizes_card_height" numeric,
    "version_sizes_card_mime_type" varchar,
    "version_sizes_card_filesize" numeric,
    "version_sizes_card_filename" varchar,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "latest" boolean
  );

  CREATE TABLE "evidence_sources_allowed_surfaces" (
    "order" integer NOT NULL,
    "parent_id" integer NOT NULL,
    "value" "enum_evidence_sources_allowed_surfaces",
    "id" serial PRIMARY KEY NOT NULL
  );

  CREATE TABLE "evidence_sources" (
    "id" serial PRIMARY KEY NOT NULL,
    "title" varchar NOT NULL,
    "url" varchar NOT NULL,
    "source_type" "enum_evidence_sources_source_type" NOT NULL,
    "publisher_or_owner" varchar NOT NULL,
    "accessed_at" timestamp(3) with time zone NOT NULL,
    "supports" varchar NOT NULL,
    "strength" "enum_evidence_sources_strength" NOT NULL,
    "permission_status" "enum_evidence_sources_permission_status" NOT NULL,
    "archived_url" varchar,
    "archived_at" timestamp(3) with time zone,
    "verification_status" "enum_evidence_sources_verification_status" DEFAULT 'proposed' NOT NULL,
    "internal_verification_notes" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "prototypes_decisions" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "title" varchar,
    "detail" varchar
  );

  CREATE TABLE "prototypes_limitations" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "prototypes" (
    "id" serial PRIMARY KEY NOT NULL,
    "title" varchar,
    "slug" varchar,
    "summary" varchar,
    "story" varchar,
    "status" "prototype_lifecycle" DEFAULT 'concept',
    "problem" varchar,
    "data_classification" "enum_prototypes_data_classification" DEFAULT 'none',
    "safety_notice" varchar,
    "data_handling_notes" varchar,
    "app_url" varchar,
    "source_url" varchar,
    "source_provenance_repository_url" varchar,
    "source_provenance_repository_owner" varchar,
    "source_provenance_repository_name" varchar,
    "source_provenance_relation" "enum_prototypes_source_provenance_relation",
    "source_provenance_license_spdx_expression" "prototype_license",
    "source_provenance_source_last_checked_at" timestamp(3) with time zone,
    "source_provenance_source_review_status" "prototype_source_review" DEFAULT 'unreviewed',
    "availability_status" "enum_prototypes_availability_status" DEFAULT 'unchecked',
    "availability_message" varchar,
    "availability_checked_at" timestamp(3) with time zone,
    "poster_id" integer,
    "featured" boolean DEFAULT false,
    "featured_order" numeric,
    "feature_until" timestamp(3) with time zone,
    "launched_at" timestamp(3) with time zone,
    "last_verified_at" timestamp(3) with time zone,
    "privacy_url" varchar,
    "terms_url" varchar,
    "service_expectations" varchar,
    "seo_meta_title" varchar,
    "seo_meta_description" varchar,
    "seo_social_image_id" integer,
    "seo_no_index" boolean DEFAULT false,
    "launch_approval" "enum_prototypes_launch_approval" DEFAULT 'not-reviewed',
    "launch_reviewer_id" integer,
    "launch_approved_at" timestamp(3) with time zone,
    "auth_reviewed_at" timestamp(3) with time zone,
    "security_reviewed_at" timestamp(3) with time zone,
    "monitoring_verified_at" timestamp(3) with time zone,
    "restore_tested_at" timestamp(3) with time zone,
    "rollback_tested_at" timestamp(3) with time zone,
    "render_service_id" varchar,
    "operational_notes" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "_status" "enum_prototypes_status" DEFAULT 'draft'
  );

  CREATE TABLE "prototypes_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "evidence_sources_id" integer
  );

  CREATE TABLE "_prototypes_v_version_decisions" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "title" varchar,
    "detail" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_prototypes_v_version_limitations" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "text" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_prototypes_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_title" varchar,
    "version_slug" varchar,
    "version_summary" varchar,
    "version_story" varchar,
    "version_status" "prototype_lifecycle" DEFAULT 'concept',
    "version_problem" varchar,
    "version_data_classification" "enum__prototypes_v_version_data_classification" DEFAULT 'none',
    "version_safety_notice" varchar,
    "version_data_handling_notes" varchar,
    "version_app_url" varchar,
    "version_source_url" varchar,
    "version_source_provenance_repository_url" varchar,
    "version_source_provenance_repository_owner" varchar,
    "version_source_provenance_repository_name" varchar,
    "version_source_provenance_relation" "enum__prototypes_v_version_source_provenance_relation",
    "version_source_provenance_license_spdx_expression" "prototype_license",
    "version_source_provenance_source_last_checked_at" timestamp(3) with time zone,
    "version_source_provenance_source_review_status" "prototype_source_review" DEFAULT 'unreviewed',
    "version_availability_status" "enum__prototypes_v_version_availability_status" DEFAULT 'unchecked',
    "version_availability_message" varchar,
    "version_availability_checked_at" timestamp(3) with time zone,
    "version_poster_id" integer,
    "version_featured" boolean DEFAULT false,
    "version_featured_order" numeric,
    "version_feature_until" timestamp(3) with time zone,
    "version_launched_at" timestamp(3) with time zone,
    "version_last_verified_at" timestamp(3) with time zone,
    "version_privacy_url" varchar,
    "version_terms_url" varchar,
    "version_service_expectations" varchar,
    "version_seo_meta_title" varchar,
    "version_seo_meta_description" varchar,
    "version_seo_social_image_id" integer,
    "version_seo_no_index" boolean DEFAULT false,
    "version_launch_approval" "enum__prototypes_v_version_launch_approval" DEFAULT 'not-reviewed',
    "version_launch_reviewer_id" integer,
    "version_launch_approved_at" timestamp(3) with time zone,
    "version_auth_reviewed_at" timestamp(3) with time zone,
    "version_security_reviewed_at" timestamp(3) with time zone,
    "version_monitoring_verified_at" timestamp(3) with time zone,
    "version_restore_tested_at" timestamp(3) with time zone,
    "version_rollback_tested_at" timestamp(3) with time zone,
    "version_render_service_id" varchar,
    "version_operational_notes" varchar,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version__status" "enum__prototypes_v_version_status" DEFAULT 'draft',
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "latest" boolean
  );

  CREATE TABLE "_prototypes_v_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "evidence_sources_id" integer
  );

  CREATE TABLE "payload_kv" (
    "id" serial PRIMARY KEY NOT NULL,
    "key" varchar NOT NULL,
    "data" jsonb NOT NULL
  );

  CREATE TABLE "payload_locked_documents" (
    "id" serial PRIMARY KEY NOT NULL,
    "global_slug" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "payload_locked_documents_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "users_id" integer,
    "media_id" integer,
    "evidence_sources_id" integer,
    "prototypes_id" integer
  );

  CREATE TABLE "payload_preferences" (
    "id" serial PRIMARY KEY NOT NULL,
    "key" varchar,
    "value" jsonb,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "payload_preferences_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "users_id" integer
  );

  CREATE TABLE "payload_migrations" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar,
    "batch" numeric,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "site_settings_social_links" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "platform" "enum_site_settings_social_links_platform" NOT NULL,
    "label" varchar NOT NULL,
    "url" varchar NOT NULL
  );

  CREATE TABLE "site_settings_organization_same_as" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "url" varchar NOT NULL
  );

  CREATE TABLE "site_settings" (
    "id" serial PRIMARY KEY NOT NULL,
    "site_name" varchar NOT NULL,
    "tagline" varchar NOT NULL,
    "canonical_origin" varchar NOT NULL,
    "contact_email" varchar,
    "booking_url" varchar,
    "default_seo_title" varchar NOT NULL,
    "default_seo_description" varchar NOT NULL,
    "default_seo_social_image_id" integer,
    "default_primary_action_id" "enum_site_settings_default_primary_action_id" NOT NULL,
    "default_secondary_action_id" "enum_site_settings_default_secondary_action_id" NOT NULL,
    "legal_footer" varchar,
    "organization_name" varchar NOT NULL,
    "organization_legal_name" varchar,
    "organization_url" varchar NOT NULL,
    "updated_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone
  );

  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_media_v" ADD CONSTRAINT "_media_v_parent_id_media_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "evidence_sources_allowed_surfaces" ADD CONSTRAINT "evidence_sources_allowed_surfaces_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."evidence_sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "prototypes_decisions" ADD CONSTRAINT "prototypes_decisions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."prototypes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "prototypes_limitations" ADD CONSTRAINT "prototypes_limitations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."prototypes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "prototypes" ADD CONSTRAINT "prototypes_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "prototypes" ADD CONSTRAINT "prototypes_seo_social_image_id_media_id_fk" FOREIGN KEY ("seo_social_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "prototypes" ADD CONSTRAINT "prototypes_launch_reviewer_id_users_id_fk" FOREIGN KEY ("launch_reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "prototypes_rels" ADD CONSTRAINT "prototypes_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."prototypes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "prototypes_rels" ADD CONSTRAINT "prototypes_rels_evidence_sources_fk" FOREIGN KEY ("evidence_sources_id") REFERENCES "public"."evidence_sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_prototypes_v_version_decisions" ADD CONSTRAINT "_prototypes_v_version_decisions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_prototypes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_prototypes_v_version_limitations" ADD CONSTRAINT "_prototypes_v_version_limitations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_prototypes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_prototypes_v" ADD CONSTRAINT "_prototypes_v_parent_id_prototypes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."prototypes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_prototypes_v" ADD CONSTRAINT "_prototypes_v_version_poster_id_media_id_fk" FOREIGN KEY ("version_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_prototypes_v" ADD CONSTRAINT "_prototypes_v_version_seo_social_image_id_media_id_fk" FOREIGN KEY ("version_seo_social_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_prototypes_v" ADD CONSTRAINT "_prototypes_v_version_launch_reviewer_id_users_id_fk" FOREIGN KEY ("version_launch_reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_prototypes_v_rels" ADD CONSTRAINT "_prototypes_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_prototypes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_prototypes_v_rels" ADD CONSTRAINT "_prototypes_v_rels_evidence_sources_fk" FOREIGN KEY ("evidence_sources_id") REFERENCES "public"."evidence_sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_evidence_sources_fk" FOREIGN KEY ("evidence_sources_id") REFERENCES "public"."evidence_sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_prototypes_fk" FOREIGN KEY ("prototypes_id") REFERENCES "public"."prototypes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_social_links" ADD CONSTRAINT "site_settings_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_organization_same_as" ADD CONSTRAINT "site_settings_organization_same_as_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_default_seo_social_image_id_media_id_fk" FOREIGN KEY ("default_seo_social_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE INDEX "media__status_idx" ON "media" USING btree ("_status");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "_media_v_parent_idx" ON "_media_v" USING btree ("parent_id");
  CREATE INDEX "_media_v_version_version_updated_at_idx" ON "_media_v" USING btree ("version_updated_at");
  CREATE INDEX "_media_v_version_version_created_at_idx" ON "_media_v" USING btree ("version_created_at");
  CREATE INDEX "_media_v_version_version__status_idx" ON "_media_v" USING btree ("version__status");
  CREATE INDEX "_media_v_version_version_filename_idx" ON "_media_v" USING btree ("version_filename");
  CREATE INDEX "_media_v_version_sizes_thumbnail_version_sizes_thumbnail_idx" ON "_media_v" USING btree ("version_sizes_thumbnail_filename");
  CREATE INDEX "_media_v_version_sizes_card_version_sizes_card_filename_idx" ON "_media_v" USING btree ("version_sizes_card_filename");
  CREATE INDEX "_media_v_created_at_idx" ON "_media_v" USING btree ("created_at");
  CREATE INDEX "_media_v_updated_at_idx" ON "_media_v" USING btree ("updated_at");
  CREATE INDEX "_media_v_latest_idx" ON "_media_v" USING btree ("latest");
  CREATE INDEX "evidence_sources_allowed_surfaces_order_idx" ON "evidence_sources_allowed_surfaces" USING btree ("order");
  CREATE INDEX "evidence_sources_allowed_surfaces_parent_idx" ON "evidence_sources_allowed_surfaces" USING btree ("parent_id");
  CREATE UNIQUE INDEX "evidence_sources_url_idx" ON "evidence_sources" USING btree ("url");
  CREATE INDEX "evidence_sources_updated_at_idx" ON "evidence_sources" USING btree ("updated_at");
  CREATE INDEX "evidence_sources_created_at_idx" ON "evidence_sources" USING btree ("created_at");
  CREATE INDEX "prototypes_decisions_order_idx" ON "prototypes_decisions" USING btree ("_order");
  CREATE INDEX "prototypes_decisions_parent_id_idx" ON "prototypes_decisions" USING btree ("_parent_id");
  CREATE INDEX "prototypes_limitations_order_idx" ON "prototypes_limitations" USING btree ("_order");
  CREATE INDEX "prototypes_limitations_parent_id_idx" ON "prototypes_limitations" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "prototypes_slug_idx" ON "prototypes" USING btree ("slug");
  CREATE INDEX "prototypes_status_idx" ON "prototypes" USING btree ("status");
  CREATE INDEX "prototypes_availability_status_idx" ON "prototypes" USING btree ("availability_status");
  CREATE INDEX "prototypes_poster_idx" ON "prototypes" USING btree ("poster_id");
  CREATE INDEX "prototypes_featured_idx" ON "prototypes" USING btree ("featured");
  CREATE INDEX "prototypes_seo_seo_social_image_idx" ON "prototypes" USING btree ("seo_social_image_id");
  CREATE INDEX "prototypes_launch_reviewer_idx" ON "prototypes" USING btree ("launch_reviewer_id");
  CREATE INDEX "prototypes_updated_at_idx" ON "prototypes" USING btree ("updated_at");
  CREATE INDEX "prototypes_created_at_idx" ON "prototypes" USING btree ("created_at");
  CREATE INDEX "prototypes__status_idx" ON "prototypes" USING btree ("_status");
  CREATE INDEX "prototypes_rels_order_idx" ON "prototypes_rels" USING btree ("order");
  CREATE INDEX "prototypes_rels_parent_idx" ON "prototypes_rels" USING btree ("parent_id");
  CREATE INDEX "prototypes_rels_path_idx" ON "prototypes_rels" USING btree ("path");
  CREATE INDEX "prototypes_rels_evidence_sources_id_idx" ON "prototypes_rels" USING btree ("evidence_sources_id");
  CREATE INDEX "_prototypes_v_version_decisions_order_idx" ON "_prototypes_v_version_decisions" USING btree ("_order");
  CREATE INDEX "_prototypes_v_version_decisions_parent_id_idx" ON "_prototypes_v_version_decisions" USING btree ("_parent_id");
  CREATE INDEX "_prototypes_v_version_limitations_order_idx" ON "_prototypes_v_version_limitations" USING btree ("_order");
  CREATE INDEX "_prototypes_v_version_limitations_parent_id_idx" ON "_prototypes_v_version_limitations" USING btree ("_parent_id");
  CREATE INDEX "_prototypes_v_parent_idx" ON "_prototypes_v" USING btree ("parent_id");
  CREATE INDEX "_prototypes_v_version_version_slug_idx" ON "_prototypes_v" USING btree ("version_slug");
  CREATE INDEX "_prototypes_v_version_version_status_idx" ON "_prototypes_v" USING btree ("version_status");
  CREATE INDEX "_prototypes_v_version_version_availability_status_idx" ON "_prototypes_v" USING btree ("version_availability_status");
  CREATE INDEX "_prototypes_v_version_version_poster_idx" ON "_prototypes_v" USING btree ("version_poster_id");
  CREATE INDEX "_prototypes_v_version_version_featured_idx" ON "_prototypes_v" USING btree ("version_featured");
  CREATE INDEX "_prototypes_v_version_seo_version_seo_social_image_idx" ON "_prototypes_v" USING btree ("version_seo_social_image_id");
  CREATE INDEX "_prototypes_v_version_version_launch_reviewer_idx" ON "_prototypes_v" USING btree ("version_launch_reviewer_id");
  CREATE INDEX "_prototypes_v_version_version_updated_at_idx" ON "_prototypes_v" USING btree ("version_updated_at");
  CREATE INDEX "_prototypes_v_version_version_created_at_idx" ON "_prototypes_v" USING btree ("version_created_at");
  CREATE INDEX "_prototypes_v_version_version__status_idx" ON "_prototypes_v" USING btree ("version__status");
  CREATE INDEX "_prototypes_v_created_at_idx" ON "_prototypes_v" USING btree ("created_at");
  CREATE INDEX "_prototypes_v_updated_at_idx" ON "_prototypes_v" USING btree ("updated_at");
  CREATE INDEX "_prototypes_v_latest_idx" ON "_prototypes_v" USING btree ("latest");
  CREATE INDEX "_prototypes_v_rels_order_idx" ON "_prototypes_v_rels" USING btree ("order");
  CREATE INDEX "_prototypes_v_rels_parent_idx" ON "_prototypes_v_rels" USING btree ("parent_id");
  CREATE INDEX "_prototypes_v_rels_path_idx" ON "_prototypes_v_rels" USING btree ("path");
  CREATE INDEX "_prototypes_v_rels_evidence_sources_id_idx" ON "_prototypes_v_rels" USING btree ("evidence_sources_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_evidence_sources_id_idx" ON "payload_locked_documents_rels" USING btree ("evidence_sources_id");
  CREATE INDEX "payload_locked_documents_rels_prototypes_id_idx" ON "payload_locked_documents_rels" USING btree ("prototypes_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "site_settings_social_links_order_idx" ON "site_settings_social_links" USING btree ("_order");
  CREATE INDEX "site_settings_social_links_parent_id_idx" ON "site_settings_social_links" USING btree ("_parent_id");
  CREATE INDEX "site_settings_organization_same_as_order_idx" ON "site_settings_organization_same_as" USING btree ("_order");
  CREATE INDEX "site_settings_organization_same_as_parent_id_idx" ON "site_settings_organization_same_as" USING btree ("_parent_id");
  CREATE INDEX "site_settings_default_seo_default_seo_social_image_idx" ON "site_settings" USING btree ("default_seo_social_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "_media_v" CASCADE;
  DROP TABLE "evidence_sources_allowed_surfaces" CASCADE;
  DROP TABLE "evidence_sources" CASCADE;
  DROP TABLE "prototypes_decisions" CASCADE;
  DROP TABLE "prototypes_limitations" CASCADE;
  DROP TABLE "prototypes" CASCADE;
  DROP TABLE "prototypes_rels" CASCADE;
  DROP TABLE "_prototypes_v_version_decisions" CASCADE;
  DROP TABLE "_prototypes_v_version_limitations" CASCADE;
  DROP TABLE "_prototypes_v" CASCADE;
  DROP TABLE "_prototypes_v_rels" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_settings_social_links" CASCADE;
  DROP TABLE "site_settings_organization_same_as" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_media_usage_rights";
  DROP TYPE "public"."enum_media_status";
  DROP TYPE "public"."enum__media_v_version_usage_rights";
  DROP TYPE "public"."enum__media_v_version_status";
  DROP TYPE "public"."enum_evidence_sources_allowed_surfaces";
  DROP TYPE "public"."enum_evidence_sources_source_type";
  DROP TYPE "public"."enum_evidence_sources_strength";
  DROP TYPE "public"."enum_evidence_sources_permission_status";
  DROP TYPE "public"."enum_evidence_sources_verification_status";
  DROP TYPE "public"."prototype_lifecycle";
  DROP TYPE "public"."enum_prototypes_data_classification";
  DROP TYPE "public"."enum_prototypes_source_provenance_relation";
  DROP TYPE "public"."prototype_license";
  DROP TYPE "public"."prototype_source_review";
  DROP TYPE "public"."enum_prototypes_availability_status";
  DROP TYPE "public"."enum_prototypes_launch_approval";
  DROP TYPE "public"."enum_prototypes_status";
  DROP TYPE "public"."enum__prototypes_v_version_data_classification";
  DROP TYPE "public"."enum__prototypes_v_version_source_provenance_relation";
  DROP TYPE "public"."enum__prototypes_v_version_availability_status";
  DROP TYPE "public"."enum__prototypes_v_version_launch_approval";
  DROP TYPE "public"."enum__prototypes_v_version_status";
  DROP TYPE "public"."enum_site_settings_social_links_platform";
  DROP TYPE "public"."enum_site_settings_default_primary_action_id";
  DROP TYPE "public"."enum_site_settings_default_secondary_action_id";`)
}
