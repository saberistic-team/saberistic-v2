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
- privacy-guarded, self-hosted Umami pageviews and a small validated event contract
- multi-stage production images, GitHub Actions CI, and a Render Blueprint

Self-hosted Umami is live as disposable validation infrastructure. The owner has authorized temporary collection from the public site through `umami.saberistic.com` while the service still shares the expiring Free database; this is an explicit launch exception, not production-grade analytics acceptance. The next product milestone is the OpenRouter explanation layer: it will explain a deterministic Production Readiness Check, not control scores or accept code, files, logs, or arbitrary prompts.

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

Umami custom host: <https://umami.saberistic.com> (DNS verified, certificate issued, and the heartbeat and tracker script responding over HTTPS on 2026-08-30)

[`render.yaml`](./render.yaml) defines the first staging environment:

- the Payload/Next.js Docker web service;
- one additional Free Umami Docker web service using a pinned official base image;
- one PostgreSQL database;
- separate `public` (Payload) and `umami` (analytics staging) schemas in that database;
- generated, service-specific website and Umami secrets;
- idempotent committed migration before the free staging server starts;
- draft-first, idempotent content migrations that preserve editorial decisions;
- `/api/ready` for website/database readiness and `/api/heartbeat` for Umami process health.

The Blueprint currently uses Render's free staging plans. Its single PostgreSQL instance is temporary, expires on 2026-09-27 unless replaced or upgraded, has no backups, and is not the production data plan. Umami uses an isolated role and schema in that shared instance. The public `Saberistic Production` Website record has ID `8bdad921-34a9-43cb-bc70-9e1c71efa911`; the tracker is limited to `saberistic.com,www.saberistic.com`, honors Do Not Track, strips queries and fragments, and validates pageview and event payloads before sending. Free web services also cannot use Render's pre-deploy phase, so startup migrations are an explicit single-instance staging compromise. Before production, choose paid web/database plans, run migrations in `preDeployCommand`, override the Docker start command to `node server.js`, give Umami a dedicated database with backup/retention procedures, add S3-compatible object storage for Payload media, and complete the backup/restore runbook in [`docs/09-operations-security-and-runbook.md`](./docs/09-operations-security-and-runbook.md). The exact live resource record and handoff are in [`docs/11-live-staging-deployment.md`](./docs/11-live-staging-deployment.md).

### Waking the Free services for a demo

Render Free web services spin down after 15 minutes without inbound traffic. Use the local helper to wake the website and Umami once before a review, or keep both warm for a short, deliberate demo window:

```bash
pnpm render:warm
pnpm render:demo
pnpm render:demo -- --minutes 90
```

`render:demo` defaults to 60 minutes, checks both services every 10 minutes, and has a hard 120-minute maximum. It is intentionally not a permanent anti-sleep daemon. The workspace receives 750 shared Free instance hours each month; two services kept continuously awake would require about 1,440 hours in a 30-day month and exceed that allowance. Upgrade the service that requires continuous availability instead of running an indefinite keepalive loop.

## Content safety model

Repository ownership proves control of source, not product maturity. Public prototype records carry explicit provenance, lifecycle, availability, sensitivity, verification, and launch-approval fields. Publication hooks reject unsafe combinations, and public queries request only an allowlisted projection while respecting Payload access control.

Resume and internet research are source leads, not blanket permission to publish claims. Approved wording and held claims are recorded in [`docs/03-verified-content-and-ai-brief.md`](./docs/03-verified-content-and-ai-brief.md).
