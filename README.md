# Saberistic V2

Saberistic V2 is a product-engineering site and prototype hub built with Next.js, Payload CMS, and PostgreSQL. The first vertical slice provides an editorial prototype registry, a public homepage and prototype catalogue, strict publication gates, and deployment infrastructure for Render.

The product direction, research record, content evidence rules, AI-readiness design, Umami plan, and phased implementation plan live in [`docs/`](./docs/README.md).

## Current slice

- Payload Admin and APIs in the same Next.js application
- PostgreSQL-backed prototypes, evidence sources, media, users, and site settings
- draft-first seed data based on audited public repositories
- public homepage, prototype index, and prototype detail pages
- fail-closed launch buttons: a URL is never enough on its own
- liveness (`/api/health`) and database readiness (`/api/ready`) endpoints
- deterministic unit tests and browser smoke tests
- multi-stage production image, GitHub Actions CI, and a Render Blueprint

Umami analytics and the OpenRouter explanation layer are intentionally planned after this CMS-to-public-page deployment is proven. The AI feature will explain a deterministic Production Readiness Check; it will not control scores or accept code, files, logs, or arbitrary prompts.

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
# or run the gates individually:
pnpm generate:types
pnpm typecheck
pnpm lint
pnpm test:int
pnpm build
pnpm test:e2e
```

Create and review a schema migration after changing Payload fields:

```bash
pnpm migrate:create initial-platform
pnpm migrate:status
```

Generated migrations belong in source control. The free staging container applies committed migrations before it starts the server because Render reserves pre-deploy commands for paid web services. Production must move the same command to Render's pre-deploy phase.

## Render staging

Live staging: <https://saberistic-web-staging.onrender.com>

Payload Admin: <https://saberistic-web-staging.onrender.com/admin>

[`render.yaml`](./render.yaml) defines the first staging environment:

- one Docker web service;
- one PostgreSQL database;
- generated `PAYLOAD_SECRET`;
- idempotent committed migration before the free staging server starts;
- a draft-first idempotent seed command for controlled initialization;
- `/api/ready` health gate.

The Blueprint currently uses Render's free staging plans. Free PostgreSQL is temporary and is not the production data plan. Free web services also cannot use Render's pre-deploy phase, so startup migrations are an explicit single-instance staging compromise. Before production, choose paid web/database plans, run migrations in `preDeployCommand`, override the Docker start command to `node server.js`, add S3-compatible object storage for Payload media, set the canonical site URLs, and complete the backup/restore runbook in [`docs/09-operations-security-and-runbook.md`](./docs/09-operations-security-and-runbook.md). The exact live resource record and handoff are in [`docs/11-live-staging-deployment.md`](./docs/11-live-staging-deployment.md).

## Content safety model

Repository ownership proves control of source, not product maturity. Public prototype records carry explicit provenance, lifecycle, availability, sensitivity, verification, and launch-approval fields. Publication hooks reject unsafe combinations, and public queries request only an allowlisted projection while respecting Payload access control.

Resume and internet research are source leads, not blanket permission to publish claims. Approved wording and held claims are recorded in [`docs/03-verified-content-and-ai-brief.md`](./docs/03-verified-content-and-ai-brief.md).
