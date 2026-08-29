# Saberistic V2

Saberistic V2 is a product-engineering site and prototype hub built with Next.js, Payload CMS, and PostgreSQL. The first vertical slice provides an editorial prototype registry, a public homepage and prototype catalogue, strict publication gates, and deployment infrastructure for Render.

The product direction, research record, content evidence rules, AI-readiness design, Umami implementation, and phased implementation plan live in [`docs/`](./docs/README.md).

## Current slice

- Payload Admin and APIs in the same Next.js application
- PostgreSQL-backed prototypes, evidence sources, Experience, Case Studies, media, users, and site settings
- draft-first seed data based on audited public repositories
- public homepage, prototype index, and prototype detail pages
- fail-closed launch buttons: a URL is never enough on its own
- liveness (`/api/health`) and database readiness (`/api/ready`) endpoints
- deterministic unit tests and browser smoke tests
- conditional, privacy-oriented Umami tracker integration
- multi-stage production images, GitHub Actions CI, and a Render Blueprint

Self-hosted Umami staging is live, but it remains a disposable validation environment and collects no production traffic. The next product milestone is the OpenRouter explanation layer: it will explain a deterministic Production Readiness Check, not control scores or accept code, files, logs, or arbitrary prompts.

## Local development

Requirements: Node.js 22, pnpm 11, and PostgreSQL 18 (Docker Compose is provided for the database).

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres
pnpm migrate
pnpm seed
pnpm dev
```

Open:

- site: <http://localhost:3000>
- Payload Admin: <http://localhost:3000/admin>
- health: <http://localhost:3000/api/health>
- readiness: <http://localhost:3000/api/ready>

The default seed is deliberately private: audited candidates are created as drafts. To create clearly labelled public concept records for local visual review, run:

```bash
pnpm seed:preview
```

Optional admin bootstrap variables are documented in [`.env.example`](./.env.example). Never commit `.env`.

## Quality checks

```bash
pnpm run verify
# or run its component gates individually:
pnpm typecheck
pnpm lint
pnpm test:int
pnpm build
# additional release checks:
pnpm generate:types
pnpm test:e2e
```

Create and review a schema migration after changing Payload fields:

```bash
pnpm migrate:create initial-platform
pnpm migrate:status
```

Generated migrations belong in source control. The free staging container applies committed migrations before it starts the server because Render reserves pre-deploy commands for paid web services. Production must move the same command to Render's pre-deploy phase.

## Render staging

Live staging: <https://saberistic.com>

Payload Admin: <https://saberistic.com/admin>

Render fallback: <https://saberistic-web-staging.onrender.com>

Umami staging: <https://saberistic-umami-staging.onrender.com>

[`render.yaml`](./render.yaml) defines the first staging environment:

- the Payload/Next.js Docker web service;
- one additional Free Umami Docker web service using a pinned official base image;
- one PostgreSQL database;
- separate `public` (Payload) and `umami` (analytics staging) schemas in that database;
- generated, service-specific website and Umami secrets;
- idempotent committed migration before the free staging server starts;
- draft-first, idempotent content migrations that preserve editorial decisions;
- `/api/ready` for website/database readiness and `/api/heartbeat` for Umami process health.

The Blueprint currently uses Render's free staging plans. Its single PostgreSQL instance is temporary, expires on 2026-09-27 unless replaced or upgraded, and is not the production data plan. Umami uses an isolated role and schema in that shared instance, so no Website ID or tracker variables are configured for `saberistic.com`. Free web services also cannot use Render's pre-deploy phase, so startup migrations are an explicit single-instance staging compromise. Before production, choose paid web/database plans, run migrations in `preDeployCommand`, override the Docker start command to `node server.js`, give Umami a dedicated database with backup/retention procedures, add S3-compatible object storage for Payload media, and complete the backup/restore runbook in [`docs/09-operations-security-and-runbook.md`](./docs/09-operations-security-and-runbook.md). The exact live resource record and handoff are in [`docs/11-live-staging-deployment.md`](./docs/11-live-staging-deployment.md).

## Content safety model

Repository ownership proves control of source, not product maturity. Public prototype records carry explicit provenance, lifecycle, availability, sensitivity, verification, and launch-approval fields. Publication hooks reject unsafe combinations, and public queries request only an allowlisted projection while respecting Payload access control.

Resume and internet research are source leads, not blanket permission to publish claims. Approved wording and held claims are recorded in [`docs/03-verified-content-and-ai-brief.md`](./docs/03-verified-content-and-ai-brief.md).
