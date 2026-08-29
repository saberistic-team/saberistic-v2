import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { seedCareerContent } from '../lib/seedCareerContent'
import type { SeedPayload } from '../lib/seedPreparedContent'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_experience_claims_allowed_surfaces" AS ENUM('homepage', 'work', 'about', 'proposal', 'private-only');
  CREATE TYPE "public"."enum_experience_claims_claim_type" AS ENUM('relationship', 'role', 'contribution', 'outcome', 'metric');
  CREATE TYPE "public"."enum_experience_claims_relationship_value" AS ENUM('employment', 'contract', 'founder', 'team_role', 'saberistic_engagement', 'sanitized_diagnostic', 'independent', 'open_source', 'research');
  CREATE TYPE "public"."enum_experience_claims_claim_status" AS ENUM('publicly_corroborated', 'founder_provided', 'hold');
  CREATE TYPE "public"."enum_experience_claims_permission_status" AS ENUM('public', 'approval-required', 'private-only');
  CREATE TYPE "public"."enum_experience_relationship" AS ENUM('employment', 'contract', 'founder', 'team_role', 'saberistic_engagement', 'sanitized_diagnostic', 'independent', 'open_source', 'research');
  CREATE TYPE "public"."enum_experience_claim_status" AS ENUM('publicly_corroborated', 'founder_provided', 'hold');
  CREATE TYPE "public"."enum_experience_permission_status" AS ENUM('public', 'approval-required', 'private-only');
  CREATE TYPE "public"."enum_experience_visibility" AS ENUM('about', 'homepage-and-about', 'hidden');
  CREATE TYPE "public"."enum_experience_publication_approval" AS ENUM('not-reviewed', 'approved', 'blocked');
  CREATE TYPE "public"."enum_experience_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__experience_v_version_claims_allowed_surfaces" AS ENUM('homepage', 'work', 'about', 'proposal', 'private-only');
  CREATE TYPE "public"."enum__experience_v_version_claims_claim_type" AS ENUM('relationship', 'role', 'contribution', 'outcome', 'metric');
  CREATE TYPE "public"."enum__experience_v_version_claims_relationship_value" AS ENUM('employment', 'contract', 'founder', 'team_role', 'saberistic_engagement', 'sanitized_diagnostic', 'independent', 'open_source', 'research');
  CREATE TYPE "public"."enum__experience_v_version_claims_claim_status" AS ENUM('publicly_corroborated', 'founder_provided', 'hold');
  CREATE TYPE "public"."enum__experience_v_version_claims_permission_status" AS ENUM('public', 'approval-required', 'private-only');
  CREATE TYPE "public"."enum__experience_v_version_relationship" AS ENUM('employment', 'contract', 'founder', 'team_role', 'saberistic_engagement', 'sanitized_diagnostic', 'independent', 'open_source', 'research');
  CREATE TYPE "public"."enum__experience_v_version_claim_status" AS ENUM('publicly_corroborated', 'founder_provided', 'hold');
  CREATE TYPE "public"."enum__experience_v_version_permission_status" AS ENUM('public', 'approval-required', 'private-only');
  CREATE TYPE "public"."enum__experience_v_version_visibility" AS ENUM('about', 'homepage-and-about', 'hidden');
  CREATE TYPE "public"."enum__experience_v_version_publication_approval" AS ENUM('not-reviewed', 'approved', 'blocked');
  CREATE TYPE "public"."enum__experience_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_case_studies_claims_allowed_surfaces" AS ENUM('homepage', 'work', 'about', 'proposal', 'private-only');
  CREATE TYPE "public"."enum_case_studies_claims_claim_type" AS ENUM('relationship', 'role', 'contribution', 'outcome', 'metric');
  CREATE TYPE "public"."enum_case_studies_claims_relationship_value" AS ENUM('employment', 'contract', 'founder', 'team_role', 'saberistic_engagement', 'sanitized_diagnostic', 'independent', 'open_source', 'research');
  CREATE TYPE "public"."enum_case_studies_claims_claim_status" AS ENUM('publicly_corroborated', 'founder_provided', 'hold');
  CREATE TYPE "public"."enum_case_studies_claims_permission_status" AS ENUM('public', 'approval-required', 'private-only');
  CREATE TYPE "public"."enum_case_studies_relationship" AS ENUM('employment', 'contract', 'founder', 'team_role', 'saberistic_engagement', 'sanitized_diagnostic', 'independent', 'open_source', 'research');
  CREATE TYPE "public"."enum_case_studies_public_content_type" AS ENUM('case_study', 'experience_profile', 'contribution_profile', 'research_profile');
  CREATE TYPE "public"."enum_case_studies_claim_status" AS ENUM('publicly_corroborated', 'founder_provided', 'hold');
  CREATE TYPE "public"."enum_case_studies_permission_status" AS ENUM('public', 'approval-required', 'private-only');
  CREATE TYPE "public"."enum_case_studies_publication_approval" AS ENUM('not-reviewed', 'approved', 'blocked');
  CREATE TYPE "public"."enum_case_studies_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__case_studies_v_version_claims_allowed_surfaces" AS ENUM('homepage', 'work', 'about', 'proposal', 'private-only');
  CREATE TYPE "public"."enum__case_studies_v_version_claims_claim_type" AS ENUM('relationship', 'role', 'contribution', 'outcome', 'metric');
  CREATE TYPE "public"."enum__case_studies_v_version_claims_relationship_value" AS ENUM('employment', 'contract', 'founder', 'team_role', 'saberistic_engagement', 'sanitized_diagnostic', 'independent', 'open_source', 'research');
  CREATE TYPE "public"."enum__case_studies_v_version_claims_claim_status" AS ENUM('publicly_corroborated', 'founder_provided', 'hold');
  CREATE TYPE "public"."enum__case_studies_v_version_claims_permission_status" AS ENUM('public', 'approval-required', 'private-only');
  CREATE TYPE "public"."enum__case_studies_v_version_relationship" AS ENUM('employment', 'contract', 'founder', 'team_role', 'saberistic_engagement', 'sanitized_diagnostic', 'independent', 'open_source', 'research');
  CREATE TYPE "public"."enum__case_studies_v_version_public_content_type" AS ENUM('case_study', 'experience_profile', 'contribution_profile', 'research_profile');
  CREATE TYPE "public"."enum__case_studies_v_version_claim_status" AS ENUM('publicly_corroborated', 'founder_provided', 'hold');
  CREATE TYPE "public"."enum__case_studies_v_version_permission_status" AS ENUM('public', 'approval-required', 'private-only');
  CREATE TYPE "public"."enum__case_studies_v_version_publication_approval" AS ENUM('not-reviewed', 'approved', 'blocked');
  CREATE TYPE "public"."enum__case_studies_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "experience_selected_work" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "experience_claims_allowed_surfaces" (
    "order" integer NOT NULL,
    "parent_id" varchar NOT NULL,
    "value" "enum_experience_claims_allowed_surfaces",
    "id" serial PRIMARY KEY NOT NULL
  );

  CREATE TABLE "experience_claims" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "claim_id" varchar,
    "statement" varchar,
    "claim_type" "enum_experience_claims_claim_type",
    "relationship_value" "enum_experience_claims_relationship_value",
    "claim_status" "enum_experience_claims_claim_status" DEFAULT 'hold',
    "permission_status" "enum_experience_claims_permission_status" DEFAULT 'approval-required',
    "permission_evidence" varchar,
    "permission_reviewer_id" integer,
    "permission_reviewed_at" timestamp(3) with time zone
  );

  CREATE TABLE "experience" (
    "id" serial PRIMARY KEY NOT NULL,
    "title" varchar,
    "slug" varchar,
    "organization" varchar,
    "role" varchar,
    "start_date" timestamp(3) with time zone,
    "end_date" timestamp(3) with time zone,
    "timeframe" varchar,
    "relationship" "enum_experience_relationship",
    "summary" varchar,
    "claim_status" "enum_experience_claim_status" DEFAULT 'hold',
    "permission_status" "enum_experience_permission_status" DEFAULT 'approval-required',
    "display_order" numeric,
    "visibility" "enum_experience_visibility" DEFAULT 'about',
    "related_case_study_id" integer,
    "publication_approval" "enum_experience_publication_approval" DEFAULT 'not-reviewed',
    "publication_reviewer_id" integer,
    "publication_approved_at" timestamp(3) with time zone,
    "internal_review_notes" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "_status" "enum_experience_status" DEFAULT 'draft'
  );

  CREATE TABLE "experience_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "evidence_sources_id" integer
  );

  CREATE TABLE "_experience_v_version_selected_work" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "text" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_experience_v_version_claims_allowed_surfaces" (
    "order" integer NOT NULL,
    "parent_id" integer NOT NULL,
    "value" "enum__experience_v_version_claims_allowed_surfaces",
    "id" serial PRIMARY KEY NOT NULL
  );

  CREATE TABLE "_experience_v_version_claims" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "claim_id" varchar,
    "statement" varchar,
    "claim_type" "enum__experience_v_version_claims_claim_type",
    "relationship_value" "enum__experience_v_version_claims_relationship_value",
    "claim_status" "enum__experience_v_version_claims_claim_status" DEFAULT 'hold',
    "permission_status" "enum__experience_v_version_claims_permission_status" DEFAULT 'approval-required',
    "permission_evidence" varchar,
    "permission_reviewer_id" integer,
    "permission_reviewed_at" timestamp(3) with time zone,
    "_uuid" varchar
  );

  CREATE TABLE "_experience_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_title" varchar,
    "version_slug" varchar,
    "version_organization" varchar,
    "version_role" varchar,
    "version_start_date" timestamp(3) with time zone,
    "version_end_date" timestamp(3) with time zone,
    "version_timeframe" varchar,
    "version_relationship" "enum__experience_v_version_relationship",
    "version_summary" varchar,
    "version_claim_status" "enum__experience_v_version_claim_status" DEFAULT 'hold',
    "version_permission_status" "enum__experience_v_version_permission_status" DEFAULT 'approval-required',
    "version_display_order" numeric,
    "version_visibility" "enum__experience_v_version_visibility" DEFAULT 'about',
    "version_related_case_study_id" integer,
    "version_publication_approval" "enum__experience_v_version_publication_approval" DEFAULT 'not-reviewed',
    "version_publication_reviewer_id" integer,
    "version_publication_approved_at" timestamp(3) with time zone,
    "version_internal_review_notes" varchar,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version__status" "enum__experience_v_version_status" DEFAULT 'draft',
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "latest" boolean
  );

  CREATE TABLE "_experience_v_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "evidence_sources_id" integer
  );

  CREATE TABLE "case_studies_decisions" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "title" varchar,
    "detail" varchar
  );

  CREATE TABLE "case_studies_capabilities" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "name" varchar
  );

  CREATE TABLE "case_studies_technologies" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "name" varchar
  );

  CREATE TABLE "case_studies_claims_allowed_surfaces" (
    "order" integer NOT NULL,
    "parent_id" varchar NOT NULL,
    "value" "enum_case_studies_claims_allowed_surfaces",
    "id" serial PRIMARY KEY NOT NULL
  );

  CREATE TABLE "case_studies_claims" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "claim_id" varchar,
    "statement" varchar,
    "claim_type" "enum_case_studies_claims_claim_type",
    "relationship_value" "enum_case_studies_claims_relationship_value",
    "claim_status" "enum_case_studies_claims_claim_status" DEFAULT 'hold',
    "permission_status" "enum_case_studies_claims_permission_status" DEFAULT 'approval-required',
    "permission_evidence" varchar,
    "permission_reviewer_id" integer,
    "permission_reviewed_at" timestamp(3) with time zone
  );

  CREATE TABLE "case_studies" (
    "id" serial PRIMARY KEY NOT NULL,
    "title" varchar,
    "slug" varchar,
    "summary" varchar,
    "body" varchar,
    "organization" varchar,
    "relationship" "enum_case_studies_relationship",
    "public_content_type" "enum_case_studies_public_content_type" DEFAULT 'experience_profile',
    "role" varchar,
    "timeframe" varchar,
    "situation" varchar,
    "responsibility" varchar,
    "outcome" varchar,
    "claim_status" "enum_case_studies_claim_status" DEFAULT 'hold',
    "permission_status" "enum_case_studies_permission_status" DEFAULT 'approval-required',
    "featured" boolean DEFAULT false,
    "sort_order" numeric,
    "seo_meta_title" varchar,
    "seo_meta_description" varchar,
    "seo_social_image_id" integer,
    "seo_no_index" boolean DEFAULT false,
    "publication_approval" "enum_case_studies_publication_approval" DEFAULT 'not-reviewed',
    "publication_reviewer_id" integer,
    "publication_approved_at" timestamp(3) with time zone,
    "internal_review_notes" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "_status" "enum_case_studies_status" DEFAULT 'draft'
  );

  CREATE TABLE "case_studies_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "evidence_sources_id" integer
  );

  CREATE TABLE "_case_studies_v_version_decisions" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "title" varchar,
    "detail" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_case_studies_v_version_capabilities" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_case_studies_v_version_technologies" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_case_studies_v_version_claims_allowed_surfaces" (
    "order" integer NOT NULL,
    "parent_id" integer NOT NULL,
    "value" "enum__case_studies_v_version_claims_allowed_surfaces",
    "id" serial PRIMARY KEY NOT NULL
  );

  CREATE TABLE "_case_studies_v_version_claims" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "claim_id" varchar,
    "statement" varchar,
    "claim_type" "enum__case_studies_v_version_claims_claim_type",
    "relationship_value" "enum__case_studies_v_version_claims_relationship_value",
    "claim_status" "enum__case_studies_v_version_claims_claim_status" DEFAULT 'hold',
    "permission_status" "enum__case_studies_v_version_claims_permission_status" DEFAULT 'approval-required',
    "permission_evidence" varchar,
    "permission_reviewer_id" integer,
    "permission_reviewed_at" timestamp(3) with time zone,
    "_uuid" varchar
  );

  CREATE TABLE "_case_studies_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_title" varchar,
    "version_slug" varchar,
    "version_summary" varchar,
    "version_body" varchar,
    "version_organization" varchar,
    "version_relationship" "enum__case_studies_v_version_relationship",
    "version_public_content_type" "enum__case_studies_v_version_public_content_type" DEFAULT 'experience_profile',
    "version_role" varchar,
    "version_timeframe" varchar,
    "version_situation" varchar,
    "version_responsibility" varchar,
    "version_outcome" varchar,
    "version_claim_status" "enum__case_studies_v_version_claim_status" DEFAULT 'hold',
    "version_permission_status" "enum__case_studies_v_version_permission_status" DEFAULT 'approval-required',
    "version_featured" boolean DEFAULT false,
    "version_sort_order" numeric,
    "version_seo_meta_title" varchar,
    "version_seo_meta_description" varchar,
    "version_seo_social_image_id" integer,
    "version_seo_no_index" boolean DEFAULT false,
    "version_publication_approval" "enum__case_studies_v_version_publication_approval" DEFAULT 'not-reviewed',
    "version_publication_reviewer_id" integer,
    "version_publication_approved_at" timestamp(3) with time zone,
    "version_internal_review_notes" varchar,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version__status" "enum__case_studies_v_version_status" DEFAULT 'draft',
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "latest" boolean
  );

  CREATE TABLE "_case_studies_v_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "evidence_sources_id" integer
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "experience_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "case_studies_id" integer;
  ALTER TABLE "experience_selected_work" ADD CONSTRAINT "experience_selected_work_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."experience"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experience_claims_allowed_surfaces" ADD CONSTRAINT "experience_claims_allowed_surfaces_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."experience_claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experience_claims" ADD CONSTRAINT "experience_claims_permission_reviewer_id_users_id_fk" FOREIGN KEY ("permission_reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "experience_claims" ADD CONSTRAINT "experience_claims_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."experience"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experience" ADD CONSTRAINT "experience_related_case_study_id_case_studies_id_fk" FOREIGN KEY ("related_case_study_id") REFERENCES "public"."case_studies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "experience" ADD CONSTRAINT "experience_publication_reviewer_id_users_id_fk" FOREIGN KEY ("publication_reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "experience_rels" ADD CONSTRAINT "experience_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."experience"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experience_rels" ADD CONSTRAINT "experience_rels_evidence_sources_fk" FOREIGN KEY ("evidence_sources_id") REFERENCES "public"."evidence_sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_experience_v_version_selected_work" ADD CONSTRAINT "_experience_v_version_selected_work_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_experience_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_experience_v_version_claims_allowed_surfaces" ADD CONSTRAINT "_experience_v_version_claims_allowed_surfaces_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_experience_v_version_claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_experience_v_version_claims" ADD CONSTRAINT "_experience_v_version_claims_permission_reviewer_id_users_id_fk" FOREIGN KEY ("permission_reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_experience_v_version_claims" ADD CONSTRAINT "_experience_v_version_claims_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_experience_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_experience_v" ADD CONSTRAINT "_experience_v_parent_id_experience_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."experience"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_experience_v" ADD CONSTRAINT "_experience_v_version_related_case_study_id_case_studies_id_fk" FOREIGN KEY ("version_related_case_study_id") REFERENCES "public"."case_studies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_experience_v" ADD CONSTRAINT "_experience_v_version_publication_reviewer_id_users_id_fk" FOREIGN KEY ("version_publication_reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_experience_v_rels" ADD CONSTRAINT "_experience_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_experience_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_experience_v_rels" ADD CONSTRAINT "_experience_v_rels_evidence_sources_fk" FOREIGN KEY ("evidence_sources_id") REFERENCES "public"."evidence_sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "case_studies_decisions" ADD CONSTRAINT "case_studies_decisions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."case_studies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "case_studies_capabilities" ADD CONSTRAINT "case_studies_capabilities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."case_studies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "case_studies_technologies" ADD CONSTRAINT "case_studies_technologies_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."case_studies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "case_studies_claims_allowed_surfaces" ADD CONSTRAINT "case_studies_claims_allowed_surfaces_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."case_studies_claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "case_studies_claims" ADD CONSTRAINT "case_studies_claims_permission_reviewer_id_users_id_fk" FOREIGN KEY ("permission_reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "case_studies_claims" ADD CONSTRAINT "case_studies_claims_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."case_studies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "case_studies" ADD CONSTRAINT "case_studies_seo_social_image_id_media_id_fk" FOREIGN KEY ("seo_social_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "case_studies" ADD CONSTRAINT "case_studies_publication_reviewer_id_users_id_fk" FOREIGN KEY ("publication_reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "case_studies_rels" ADD CONSTRAINT "case_studies_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."case_studies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "case_studies_rels" ADD CONSTRAINT "case_studies_rels_evidence_sources_fk" FOREIGN KEY ("evidence_sources_id") REFERENCES "public"."evidence_sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_case_studies_v_version_decisions" ADD CONSTRAINT "_case_studies_v_version_decisions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_case_studies_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_case_studies_v_version_capabilities" ADD CONSTRAINT "_case_studies_v_version_capabilities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_case_studies_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_case_studies_v_version_technologies" ADD CONSTRAINT "_case_studies_v_version_technologies_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_case_studies_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_case_studies_v_version_claims_allowed_surfaces" ADD CONSTRAINT "_case_studies_v_version_claims_allowed_surfaces_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_case_studies_v_version_claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_case_studies_v_version_claims" ADD CONSTRAINT "_case_studies_v_version_claims_permission_reviewer_id_users_id_fk" FOREIGN KEY ("permission_reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_case_studies_v_version_claims" ADD CONSTRAINT "_case_studies_v_version_claims_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_case_studies_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_case_studies_v" ADD CONSTRAINT "_case_studies_v_parent_id_case_studies_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."case_studies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_case_studies_v" ADD CONSTRAINT "_case_studies_v_version_seo_social_image_id_media_id_fk" FOREIGN KEY ("version_seo_social_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_case_studies_v" ADD CONSTRAINT "_case_studies_v_version_publication_reviewer_id_users_id_fk" FOREIGN KEY ("version_publication_reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_case_studies_v_rels" ADD CONSTRAINT "_case_studies_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_case_studies_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_case_studies_v_rels" ADD CONSTRAINT "_case_studies_v_rels_evidence_sources_fk" FOREIGN KEY ("evidence_sources_id") REFERENCES "public"."evidence_sources"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "experience_selected_work_order_idx" ON "experience_selected_work" USING btree ("_order");
  CREATE INDEX "experience_selected_work_parent_id_idx" ON "experience_selected_work" USING btree ("_parent_id");
  CREATE INDEX "experience_claims_allowed_surfaces_order_idx" ON "experience_claims_allowed_surfaces" USING btree ("order");
  CREATE INDEX "experience_claims_allowed_surfaces_parent_idx" ON "experience_claims_allowed_surfaces" USING btree ("parent_id");
  CREATE INDEX "experience_claims_order_idx" ON "experience_claims" USING btree ("_order");
  CREATE INDEX "experience_claims_parent_id_idx" ON "experience_claims" USING btree ("_parent_id");
  CREATE INDEX "experience_claims_permission_reviewer_idx" ON "experience_claims" USING btree ("permission_reviewer_id");
  CREATE UNIQUE INDEX "experience_slug_idx" ON "experience" USING btree ("slug");
  CREATE INDEX "experience_relationship_idx" ON "experience" USING btree ("relationship");
  CREATE INDEX "experience_visibility_idx" ON "experience" USING btree ("visibility");
  CREATE INDEX "experience_related_case_study_idx" ON "experience" USING btree ("related_case_study_id");
  CREATE INDEX "experience_publication_reviewer_idx" ON "experience" USING btree ("publication_reviewer_id");
  CREATE INDEX "experience_updated_at_idx" ON "experience" USING btree ("updated_at");
  CREATE INDEX "experience_created_at_idx" ON "experience" USING btree ("created_at");
  CREATE INDEX "experience__status_idx" ON "experience" USING btree ("_status");
  CREATE INDEX "experience_rels_order_idx" ON "experience_rels" USING btree ("order");
  CREATE INDEX "experience_rels_parent_idx" ON "experience_rels" USING btree ("parent_id");
  CREATE INDEX "experience_rels_path_idx" ON "experience_rels" USING btree ("path");
  CREATE INDEX "experience_rels_evidence_sources_id_idx" ON "experience_rels" USING btree ("evidence_sources_id");
  CREATE INDEX "_experience_v_version_selected_work_order_idx" ON "_experience_v_version_selected_work" USING btree ("_order");
  CREATE INDEX "_experience_v_version_selected_work_parent_id_idx" ON "_experience_v_version_selected_work" USING btree ("_parent_id");
  CREATE INDEX "_experience_v_version_claims_allowed_surfaces_order_idx" ON "_experience_v_version_claims_allowed_surfaces" USING btree ("order");
  CREATE INDEX "_experience_v_version_claims_allowed_surfaces_parent_idx" ON "_experience_v_version_claims_allowed_surfaces" USING btree ("parent_id");
  CREATE INDEX "_experience_v_version_claims_order_idx" ON "_experience_v_version_claims" USING btree ("_order");
  CREATE INDEX "_experience_v_version_claims_parent_id_idx" ON "_experience_v_version_claims" USING btree ("_parent_id");
  CREATE INDEX "_experience_v_version_claims_permission_reviewer_idx" ON "_experience_v_version_claims" USING btree ("permission_reviewer_id");
  CREATE INDEX "_experience_v_parent_idx" ON "_experience_v" USING btree ("parent_id");
  CREATE INDEX "_experience_v_version_version_slug_idx" ON "_experience_v" USING btree ("version_slug");
  CREATE INDEX "_experience_v_version_version_relationship_idx" ON "_experience_v" USING btree ("version_relationship");
  CREATE INDEX "_experience_v_version_version_visibility_idx" ON "_experience_v" USING btree ("version_visibility");
  CREATE INDEX "_experience_v_version_version_related_case_study_idx" ON "_experience_v" USING btree ("version_related_case_study_id");
  CREATE INDEX "_experience_v_version_version_publication_reviewer_idx" ON "_experience_v" USING btree ("version_publication_reviewer_id");
  CREATE INDEX "_experience_v_version_version_updated_at_idx" ON "_experience_v" USING btree ("version_updated_at");
  CREATE INDEX "_experience_v_version_version_created_at_idx" ON "_experience_v" USING btree ("version_created_at");
  CREATE INDEX "_experience_v_version_version__status_idx" ON "_experience_v" USING btree ("version__status");
  CREATE INDEX "_experience_v_created_at_idx" ON "_experience_v" USING btree ("created_at");
  CREATE INDEX "_experience_v_updated_at_idx" ON "_experience_v" USING btree ("updated_at");
  CREATE INDEX "_experience_v_latest_idx" ON "_experience_v" USING btree ("latest");
  CREATE INDEX "_experience_v_rels_order_idx" ON "_experience_v_rels" USING btree ("order");
  CREATE INDEX "_experience_v_rels_parent_idx" ON "_experience_v_rels" USING btree ("parent_id");
  CREATE INDEX "_experience_v_rels_path_idx" ON "_experience_v_rels" USING btree ("path");
  CREATE INDEX "_experience_v_rels_evidence_sources_id_idx" ON "_experience_v_rels" USING btree ("evidence_sources_id");
  CREATE INDEX "case_studies_decisions_order_idx" ON "case_studies_decisions" USING btree ("_order");
  CREATE INDEX "case_studies_decisions_parent_id_idx" ON "case_studies_decisions" USING btree ("_parent_id");
  CREATE INDEX "case_studies_capabilities_order_idx" ON "case_studies_capabilities" USING btree ("_order");
  CREATE INDEX "case_studies_capabilities_parent_id_idx" ON "case_studies_capabilities" USING btree ("_parent_id");
  CREATE INDEX "case_studies_technologies_order_idx" ON "case_studies_technologies" USING btree ("_order");
  CREATE INDEX "case_studies_technologies_parent_id_idx" ON "case_studies_technologies" USING btree ("_parent_id");
  CREATE INDEX "case_studies_claims_allowed_surfaces_order_idx" ON "case_studies_claims_allowed_surfaces" USING btree ("order");
  CREATE INDEX "case_studies_claims_allowed_surfaces_parent_idx" ON "case_studies_claims_allowed_surfaces" USING btree ("parent_id");
  CREATE INDEX "case_studies_claims_order_idx" ON "case_studies_claims" USING btree ("_order");
  CREATE INDEX "case_studies_claims_parent_id_idx" ON "case_studies_claims" USING btree ("_parent_id");
  CREATE INDEX "case_studies_claims_permission_reviewer_idx" ON "case_studies_claims" USING btree ("permission_reviewer_id");
  CREATE UNIQUE INDEX "case_studies_slug_idx" ON "case_studies" USING btree ("slug");
  CREATE INDEX "case_studies_relationship_idx" ON "case_studies" USING btree ("relationship");
  CREATE INDEX "case_studies_featured_idx" ON "case_studies" USING btree ("featured");
  CREATE INDEX "case_studies_seo_seo_social_image_idx" ON "case_studies" USING btree ("seo_social_image_id");
  CREATE INDEX "case_studies_publication_reviewer_idx" ON "case_studies" USING btree ("publication_reviewer_id");
  CREATE INDEX "case_studies_updated_at_idx" ON "case_studies" USING btree ("updated_at");
  CREATE INDEX "case_studies_created_at_idx" ON "case_studies" USING btree ("created_at");
  CREATE INDEX "case_studies__status_idx" ON "case_studies" USING btree ("_status");
  CREATE INDEX "case_studies_rels_order_idx" ON "case_studies_rels" USING btree ("order");
  CREATE INDEX "case_studies_rels_parent_idx" ON "case_studies_rels" USING btree ("parent_id");
  CREATE INDEX "case_studies_rels_path_idx" ON "case_studies_rels" USING btree ("path");
  CREATE INDEX "case_studies_rels_evidence_sources_id_idx" ON "case_studies_rels" USING btree ("evidence_sources_id");
  CREATE INDEX "_case_studies_v_version_decisions_order_idx" ON "_case_studies_v_version_decisions" USING btree ("_order");
  CREATE INDEX "_case_studies_v_version_decisions_parent_id_idx" ON "_case_studies_v_version_decisions" USING btree ("_parent_id");
  CREATE INDEX "_case_studies_v_version_capabilities_order_idx" ON "_case_studies_v_version_capabilities" USING btree ("_order");
  CREATE INDEX "_case_studies_v_version_capabilities_parent_id_idx" ON "_case_studies_v_version_capabilities" USING btree ("_parent_id");
  CREATE INDEX "_case_studies_v_version_technologies_order_idx" ON "_case_studies_v_version_technologies" USING btree ("_order");
  CREATE INDEX "_case_studies_v_version_technologies_parent_id_idx" ON "_case_studies_v_version_technologies" USING btree ("_parent_id");
  CREATE INDEX "_case_studies_v_version_claims_allowed_surfaces_order_idx" ON "_case_studies_v_version_claims_allowed_surfaces" USING btree ("order");
  CREATE INDEX "_case_studies_v_version_claims_allowed_surfaces_parent_idx" ON "_case_studies_v_version_claims_allowed_surfaces" USING btree ("parent_id");
  CREATE INDEX "_case_studies_v_version_claims_order_idx" ON "_case_studies_v_version_claims" USING btree ("_order");
  CREATE INDEX "_case_studies_v_version_claims_parent_id_idx" ON "_case_studies_v_version_claims" USING btree ("_parent_id");
  CREATE INDEX "_case_studies_v_version_claims_permission_reviewer_idx" ON "_case_studies_v_version_claims" USING btree ("permission_reviewer_id");
  CREATE INDEX "_case_studies_v_parent_idx" ON "_case_studies_v" USING btree ("parent_id");
  CREATE INDEX "_case_studies_v_version_version_slug_idx" ON "_case_studies_v" USING btree ("version_slug");
  CREATE INDEX "_case_studies_v_version_version_relationship_idx" ON "_case_studies_v" USING btree ("version_relationship");
  CREATE INDEX "_case_studies_v_version_version_featured_idx" ON "_case_studies_v" USING btree ("version_featured");
  CREATE INDEX "_case_studies_v_version_seo_version_seo_social_image_idx" ON "_case_studies_v" USING btree ("version_seo_social_image_id");
  CREATE INDEX "_case_studies_v_version_version_publication_reviewer_idx" ON "_case_studies_v" USING btree ("version_publication_reviewer_id");
  CREATE INDEX "_case_studies_v_version_version_updated_at_idx" ON "_case_studies_v" USING btree ("version_updated_at");
  CREATE INDEX "_case_studies_v_version_version_created_at_idx" ON "_case_studies_v" USING btree ("version_created_at");
  CREATE INDEX "_case_studies_v_version_version__status_idx" ON "_case_studies_v" USING btree ("version__status");
  CREATE INDEX "_case_studies_v_created_at_idx" ON "_case_studies_v" USING btree ("created_at");
  CREATE INDEX "_case_studies_v_updated_at_idx" ON "_case_studies_v" USING btree ("updated_at");
  CREATE INDEX "_case_studies_v_latest_idx" ON "_case_studies_v" USING btree ("latest");
  CREATE INDEX "_case_studies_v_rels_order_idx" ON "_case_studies_v_rels" USING btree ("order");
  CREATE INDEX "_case_studies_v_rels_parent_idx" ON "_case_studies_v_rels" USING btree ("parent_id");
  CREATE INDEX "_case_studies_v_rels_path_idx" ON "_case_studies_v_rels" USING btree ("path");
  CREATE INDEX "_case_studies_v_rels_evidence_sources_id_idx" ON "_case_studies_v_rels" USING btree ("evidence_sources_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_experience_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experience"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_case_studies_fk" FOREIGN KEY ("case_studies_id") REFERENCES "public"."case_studies"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_experience_id_idx" ON "payload_locked_documents_rels" USING btree ("experience_id");
  CREATE INDEX "payload_locked_documents_rels_case_studies_id_idx" ON "payload_locked_documents_rels" USING btree ("case_studies_id");`)

  await seedCareerContent(payload as unknown as SeedPayload, req)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  throw new Error(
    'Migration 20260829_151905 is intentionally non-reversible because dropping these tables would destroy editorial content and version history. Restore a reviewed database backup for rollback.',
  )

  // Retained only as generated schema documentation. The fail-closed guard above must remain.
  await db.execute(sql`
   ALTER TABLE "experience_selected_work" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "experience_claims_allowed_surfaces" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "experience_claims" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "experience" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "experience_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_experience_v_version_selected_work" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_experience_v_version_claims_allowed_surfaces" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_experience_v_version_claims" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_experience_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_experience_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "case_studies_decisions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "case_studies_capabilities" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "case_studies_technologies" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "case_studies_claims_allowed_surfaces" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "case_studies_claims" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "case_studies" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "case_studies_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_case_studies_v_version_decisions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_case_studies_v_version_capabilities" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_case_studies_v_version_technologies" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_case_studies_v_version_claims_allowed_surfaces" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_case_studies_v_version_claims" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_case_studies_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_case_studies_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_experience_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_case_studies_fk";
  DROP INDEX "payload_locked_documents_rels_experience_id_idx";
  DROP INDEX "payload_locked_documents_rels_case_studies_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "experience_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "case_studies_id";
  DROP TABLE "experience_selected_work" CASCADE;
  DROP TABLE "experience_claims_allowed_surfaces" CASCADE;
  DROP TABLE "experience_claims" CASCADE;
  DROP TABLE "experience" CASCADE;
  DROP TABLE "experience_rels" CASCADE;
  DROP TABLE "_experience_v_version_selected_work" CASCADE;
  DROP TABLE "_experience_v_version_claims_allowed_surfaces" CASCADE;
  DROP TABLE "_experience_v_version_claims" CASCADE;
  DROP TABLE "_experience_v" CASCADE;
  DROP TABLE "_experience_v_rels" CASCADE;
  DROP TABLE "case_studies_decisions" CASCADE;
  DROP TABLE "case_studies_capabilities" CASCADE;
  DROP TABLE "case_studies_technologies" CASCADE;
  DROP TABLE "case_studies_claims_allowed_surfaces" CASCADE;
  DROP TABLE "case_studies_claims" CASCADE;
  DROP TABLE "case_studies" CASCADE;
  DROP TABLE "case_studies_rels" CASCADE;
  DROP TABLE "_case_studies_v_version_decisions" CASCADE;
  DROP TABLE "_case_studies_v_version_capabilities" CASCADE;
  DROP TABLE "_case_studies_v_version_technologies" CASCADE;
  DROP TABLE "_case_studies_v_version_claims_allowed_surfaces" CASCADE;
  DROP TABLE "_case_studies_v_version_claims" CASCADE;
  DROP TABLE "_case_studies_v" CASCADE;
  DROP TABLE "_case_studies_v_rels" CASCADE;
  DROP TYPE "public"."enum_experience_claims_allowed_surfaces";
  DROP TYPE "public"."enum_experience_claims_claim_type";
  DROP TYPE "public"."enum_experience_claims_relationship_value";
  DROP TYPE "public"."enum_experience_claims_claim_status";
  DROP TYPE "public"."enum_experience_claims_permission_status";
  DROP TYPE "public"."enum_experience_relationship";
  DROP TYPE "public"."enum_experience_claim_status";
  DROP TYPE "public"."enum_experience_permission_status";
  DROP TYPE "public"."enum_experience_visibility";
  DROP TYPE "public"."enum_experience_publication_approval";
  DROP TYPE "public"."enum_experience_status";
  DROP TYPE "public"."enum__experience_v_version_claims_allowed_surfaces";
  DROP TYPE "public"."enum__experience_v_version_claims_claim_type";
  DROP TYPE "public"."enum__experience_v_version_claims_relationship_value";
  DROP TYPE "public"."enum__experience_v_version_claims_claim_status";
  DROP TYPE "public"."enum__experience_v_version_claims_permission_status";
  DROP TYPE "public"."enum__experience_v_version_relationship";
  DROP TYPE "public"."enum__experience_v_version_claim_status";
  DROP TYPE "public"."enum__experience_v_version_permission_status";
  DROP TYPE "public"."enum__experience_v_version_visibility";
  DROP TYPE "public"."enum__experience_v_version_publication_approval";
  DROP TYPE "public"."enum__experience_v_version_status";
  DROP TYPE "public"."enum_case_studies_claims_allowed_surfaces";
  DROP TYPE "public"."enum_case_studies_claims_claim_type";
  DROP TYPE "public"."enum_case_studies_claims_relationship_value";
  DROP TYPE "public"."enum_case_studies_claims_claim_status";
  DROP TYPE "public"."enum_case_studies_claims_permission_status";
  DROP TYPE "public"."enum_case_studies_relationship";
  DROP TYPE "public"."enum_case_studies_public_content_type";
  DROP TYPE "public"."enum_case_studies_claim_status";
  DROP TYPE "public"."enum_case_studies_permission_status";
  DROP TYPE "public"."enum_case_studies_publication_approval";
  DROP TYPE "public"."enum_case_studies_status";
  DROP TYPE "public"."enum__case_studies_v_version_claims_allowed_surfaces";
  DROP TYPE "public"."enum__case_studies_v_version_claims_claim_type";
  DROP TYPE "public"."enum__case_studies_v_version_claims_relationship_value";
  DROP TYPE "public"."enum__case_studies_v_version_claims_claim_status";
  DROP TYPE "public"."enum__case_studies_v_version_claims_permission_status";
  DROP TYPE "public"."enum__case_studies_v_version_relationship";
  DROP TYPE "public"."enum__case_studies_v_version_public_content_type";
  DROP TYPE "public"."enum__case_studies_v_version_claim_status";
  DROP TYPE "public"."enum__case_studies_v_version_permission_status";
  DROP TYPE "public"."enum__case_studies_v_version_publication_approval";
  DROP TYPE "public"."enum__case_studies_v_version_status";`)
}
