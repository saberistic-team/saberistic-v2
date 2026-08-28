# Saberistic V2 documentation

This folder is the implementation source of truth for Saberistic V2. It consolidates the product critique, verified career evidence, the supplied company and personal GitHub inventories, content direction, CMS and analytics choices, the visitor-facing AI feature, the prototype hub, and the Render deployment plan discussed in this project.

## North star

Saberistic should feel like a working demonstration of senior product engineering, not a conventional agency brochure.

The site has three jobs:

1. Establish credible technical leadership through specific, verifiable proof.
2. Make original app prototypes easy to discover, understand, and try.
3. Convert the right visitors through a useful **Production Readiness Check**, followed by a paid human Architecture Diagnostic or a scoped engineering engagement.

The product promise is:

> Senior engineering for ambitious products — from first prototype to production readiness.

## Accepted architecture

| Concern | Decision | Reason |
|---|---|---|
| Website and CMS | Next.js and MIT-licensed Payload in one TypeScript application | Payload is native to Next.js, self-hostable, keeps the admin and frontend in one codebase, and avoids an unnecessary API service. |
| Primary database | Dedicated Render Postgres | Managed backups, private-network access, and a clean migration path. |
| Media | S3-compatible object storage through Payload's official S3 adapter | Render service filesystems are ephemeral; a persistent disk would limit scaling and zero-downtime deploys. |
| Analytics | Self-hosted, MIT-licensed Umami with its own Render Postgres | Privacy-first analytics remain operationally and permission-isolated from website content. |
| AI feature | Deterministic readiness engine plus OpenRouter for explanation | The score remains testable and defensible while the visitor still sees useful generative AI immediately. |
| Abuse controls | Render Key Value-backed rate limiting before public AI launch | Prevents one visitor or bot from exhausting the OpenRouter budget. |
| Hosting | Render Blueprint for the core platform | Infrastructure is reviewable, reproducible, and grouped into staging and production environments. |
| Prototypes | Hub-and-spoke: independent apps registered in Payload | Each experiment can use its own stack and deployment cadence without endangering the main site. |

## Documentation map

| Document | Purpose |
|---|---|
| [00 — Project context and research summary](./00-project-context-and-research-summary.md) | Request history, source material, original critique, tool selection, and research method. |
| [01 — Product and site strategy](./01-product-and-site-strategy.md) | Positioning, audiences, offers, conversion model, scope, and success criteria. |
| [02 — Information architecture and prototype hub](./02-information-architecture-and-prototype-hub.md) | Routes, page hierarchy, prototype lifecycle, URL strategy, and publishing workflow. |
| [03 — Verified content and AI brief](./03-verified-content-and-ai-brief.md) | Resume-derived copy, public evidence, claim holds, case-study language, and the original AI concept. |
| [04 — Payload CMS implementation](./04-payload-cms-implementation.md) | Collections, fields, access control, drafts, migrations, media, and seed content. |
| [05 — Umami analytics implementation](./05-umami-analytics-implementation.md) | Self-hosting, event taxonomy, funnels, privacy rules, and reporting. |
| [06 — OpenRouter readiness check](./06-openrouter-readiness-check-implementation.md) | User experience, deterministic policy engine, model contract, security, cost controls, and testing. |
| [07 — Render deployment architecture](./07-render-deployment-architecture.md) | Services, environments, domains, secrets, database strategy, health checks, and Blueprint outline. |
| [08 — Implementation plan](./08-implementation-plan.md) | Ordered workstreams, dependencies, acceptance criteria, launch gates, and backlog. |
| [09 — Operations and security runbook](./09-operations-security-and-runbook.md) | Backups, monitoring, restores, incident response, privacy, and key rotation. |
| [10 — Architecture decision log](./10-architecture-decision-log.md) | Decisions that should not be reopened without new evidence. |

## Recommended first release

The smallest credible V2 includes:

- the homepage, Work, Prototypes, Services, About, and Contact routes;
- a Payload admin with verified experience, case studies, prototypes, pages, services, evidence sources, media, and private diagnostic/contact requests;
- three complete prototype entries, at least two functioning public prototypes, and one polished featured `beta` or `live` experience;
- the deterministic Readiness Check with an OpenRouter-written explanation;
- self-hosted Umami pageview and conversion events;
- a Render staging and production deployment;
- privacy, terms, an AI disclosure, and an analytics opt-out mechanism if required by the chosen policy.

Do not delay launch for a full blog, user accounts, repository ingestion, free-form AI chat, automated code review, or a custom analytics dashboard.

## Current repository state

At the time this documentation was written, the repository contained documentation only. It had no application scaffold and was not initialized as a Git repository. A working `render.yaml` should be added only after the application, migrations, Dockerfile, health endpoints, and start commands exist and have been tested locally.

## Source-of-truth rules

- Public claims must follow the evidence labels and claim holds in [03](./03-verified-content-and-ai-brief.md).
- Payload owns editorial content, prototype records, SEO metadata, and evidence references.
- Git owns collection schemas, migrations, readiness rules, prompts, event names, infrastructure, and security policy.
- Umami receives behavioral metadata only. It must never receive readiness answers, generated reports, contact details, email addresses, or other personal data.
- OpenRouter receives normalized assessment choices plus, only when the visitor supplies it, one bounded optional symptom after local sensitive-data checks. Contact information and every other arbitrary visitor-text field stay outside the model request.
- Production secrets live in Render, never in Git or Payload rich text.

## Definition of done

V2 is ready to launch when a visitor can understand the offer in one screen, inspect evidence without trusting unsupported claims, try either of at least two functioning public prototypes, complete the readiness check, receive a useful result even if OpenRouter is unavailable, and book or request the next human step. Editors must be able to publish a new prototype without a code change, and the team must be able to restore both databases from a documented procedure.
