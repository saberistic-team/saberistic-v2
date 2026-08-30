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

| Concern          | Decision                                                                                       | Reason                                                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Website and CMS  | Next.js static export for the public surface; MIT-licensed Payload remains the dynamic CMS/API | Public pages stay on the CDN during CMS cold starts while schemas, views, and content contracts remain in one TypeScript repository. |
| Primary database | Dedicated Render Postgres                                                                      | Managed backups, private-network access, and a clean migration path.                                                                 |
| Media            | S3-compatible object storage through Payload's official S3 adapter                             | Render service filesystems are ephemeral; a persistent disk would limit scaling and zero-downtime deploys.                           |
| Analytics        | Self-hosted, MIT-licensed Umami; shared-schema Free staging, dedicated Postgres for production | Staging avoids an unapproved database charge; production restores workload, permission, backup, and failure-domain isolation.        |
| AI feature       | Deterministic readiness engine plus OpenRouter for explanation                                 | The score remains testable and defensible while the visitor still sees useful generative AI immediately.                             |
| Abuse controls   | Render Key Value-backed rate limiting before public AI launch                                  | Prevents one visitor or bot from exhausting the OpenRouter budget.                                                                   |
| Hosting          | Render Static Site plus Blueprint-managed Payload and Umami services                           | The public site does not sleep; infrastructure remains reviewable and reproducible.                                                  |
| Prototypes       | Hub-and-spoke: independent apps registered in Payload                                          | Each experiment can use its own stack and deployment cadence without endangering the main site.                                      |

## Documentation map

| Document                                                                                                          | Purpose                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [00 — Project context and research summary](./00-project-context-and-research-summary.md)                         | Request history, source material, original critique, tool selection, and research method.                                        |
| [01 — Product and site strategy](./01-product-and-site-strategy.md)                                               | Positioning, audiences, offers, conversion model, scope, and success criteria.                                                   |
| [02 — Information architecture and prototype hub](./02-information-architecture-and-prototype-hub.md)             | Routes, page hierarchy, prototype lifecycle, URL strategy, and publishing workflow.                                              |
| [03 — Verified content and AI brief](./03-verified-content-and-ai-brief.md)                                       | Resume-derived copy, public evidence, claim holds, case-study language, and the original AI concept.                             |
| [04 — Payload CMS implementation](./04-payload-cms-implementation.md)                                             | Collections, fields, access control, drafts, migrations, media, and seed content.                                                |
| [05 — Umami analytics implementation](./05-umami-analytics-implementation.md)                                     | Self-hosting, event taxonomy, funnels, privacy rules, and reporting.                                                             |
| [06 — OpenRouter readiness check](./06-openrouter-readiness-check-implementation.md)                              | User experience, deterministic policy engine, model contract, security, cost controls, and testing.                              |
| [07 — Render deployment architecture](./07-render-deployment-architecture.md)                                     | Services, environments, domains, secrets, database strategy, health checks, and Blueprint outline.                               |
| [08 — Implementation plan](./08-implementation-plan.md)                                                           | Ordered workstreams, dependencies, acceptance criteria, launch gates, and backlog.                                               |
| [09 — Operations and security runbook](./09-operations-security-and-runbook.md)                                   | Backups, monitoring, restores, incident response, privacy, and key rotation.                                                     |
| [10 — Architecture decision log](./10-architecture-decision-log.md)                                               | Decisions that should not be reopened without new evidence.                                                                      |
| [11 — Live staging deployment](./11-live-staging-deployment.md)                                                   | Live URLs and resource IDs, deployment verification, retired resources, current limits, and operator handoff.                    |
| [12 — Payload content import and origin fix](./12-payload-content-import-and-origin-fix.md)                       | Custom-domain admin authentication, transactional content import, verification, and remaining résumé schema.                     |
| [13 — Prototype approval, career content, and Umami rollout](./13-prototype-approval-career-content-and-umami.md) | Live prototype decisions, Experience/Case Studies schemas and seeds, publication gates, and the zero-cost Umami staging rollout. |
| [14 — Render Static Site rollout](./14-render-static-site-rollout.md)                                             | Static export contract, CMS-triggered builds, domain transfer, verification, rollback, and operations.                           |
| [15 — Brand, SEO, Lighthouse, and Web Vitals](./15-brand-seo-lighthouse-and-web-vitals.md)                        | Supplied logo integration, metadata/crawl hardening, Lighthouse evidence, and the Umami CLS correction.                          |
| [16 — Build Notes and Harness from Scratch](./16-build-notes-and-harness-from-scratch.md)                         | Git-authored journal architecture, first article evidence, SVG/code treatment, analytics, verification, and authoring workflow.  |

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

The Payload/Next.js slice is implemented, tested, published to GitHub, and deployed to Render
staging. The public homepage and prototype hub now run on a Render Static Site CDN, so public-page
availability no longer depends on a warm Payload process. BackThen and Story Sprout Pay are
published; FrescoPay remains held without a verified canonical app URL, and TadaDing remains held
because its registered deployment returns HTTP 404. Payload contains 13 evidence records plus four
review-gated Experience and four Case Study drafts, all not reviewed. Self-hosted Umami is live on a
separate Free web service; the owner has enabled 2FA, and temporary public collection through
`umami.saberistic.com` passed live tracker, ingestion, privacy-payload, and dashboard acceptance. The
supplied Saberistic mark, favicon conventions, route canonicals, robots, sitemap, social metadata,
structured data, legacy redirects, and Web Vitals zero-CLS normalization are deployed and passed
the live acceptance recorded in [15](./15-brand-seo-lighthouse-and-web-vitals.md). Final Lighthouse
scores are 97/100/100/100 on mobile and 100/100/100/100 on desktop, with CLS 0 on both. The
Git-authored Build Notes journal, RSS feed, and first source-verified Harness from Scratch article
are live on the Static Site without changing the Payload snapshot contract. The article documents
the Pi/Qwen bootstrap, M0 contracts, failures, passing 40-test result, and incomplete boundaries
with code and accessible SVG diagrams. Its production Lighthouse median is 99/100/100/100 on mobile
and 100/100/100/100 on desktop, with CLS 0 on both. The expiring shared database, missing
backup/retention automation, backend cold starts, and one stale `www` DNS target remain unresolved
operational requirements. See
[11](./11-live-staging-deployment.md) for the live record and
[14](./14-render-static-site-rollout.md) for the static rollout and remaining DNS cleanup.

## Source-of-truth rules

- Public claims must follow the evidence labels and claim holds in [03](./03-verified-content-and-ai-brief.md).
- Payload owns general editable content, prototype records, CMS-projected SEO metadata, and evidence
  references. ADR-020 makes Build Notes a narrow Git-authored exception for code-adjacent evidence.
- Git owns Build Notes, collection schemas, migrations, readiness rules, prompts, event names,
  infrastructure, and security policy.
- Umami receives behavioral metadata only. It must never receive readiness answers, generated reports, contact details, email addresses, or other personal data.
- OpenRouter receives normalized assessment choices plus, only when the visitor supplies it, one bounded optional symptom after local sensitive-data checks. Contact information and every other arbitrary visitor-text field stay outside the model request.
- Production secrets live in Render, never in Git or Payload rich text.

## Definition of done

V2 is ready to launch when a visitor can understand the offer in one screen, inspect evidence without trusting unsupported claims, try either of at least two functioning public prototypes, complete the readiness check, receive a useful result even if OpenRouter is unavailable, and book or request the next human step. Editors must be able to prepare a new prototype without a code change, an administrator must be able to complete its gated publication review, and the team must be able to restore every production database from a documented procedure.
