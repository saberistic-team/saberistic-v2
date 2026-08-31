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
| [17 — TurboPass Rust + Temporal Build Note](./17-turbopass-rust-temporal-build-note.md)                           | FFI bridge removal, compatible token lifecycle, Temporal rotation, local integration harness, evidence, and rollout gates.       |
| [18 — Harness Platform M1 Operator Loop](./18-harness-operator-loop-m1-build-note.md)                             | SQLite evidence, terminal viewer, golden eval, compiled policy, CI composition, truth boundaries, and release plan.              |
| [19 — Three Lovable prototypes](./19-three-lovable-prototypes.md)                                                 | Source audits, Payload publication gates, shared product architecture, Build Note 004, and production acceptance.                |
| [20 — CryptoPal Build Note](./20-cryptopal-build-note.md)                                                         | Original PlantUML, two blinded-token hops, local Solana protocol, recorded walkthrough, privacy limits, and load evidence.       |
| [21 — Growth Program v2 Build Note](./21-growth-program-v2-build-note.md)                                         | Legacy containment, fixed-point v2 score credentials, website boundaries, local-validator demo, and release gates.               |
| [22 — Harness Platform M2 Eval Credibility](./22-harness-eval-credibility-m2-build-note.md)                       | Golden-repository calibration, SDK scenarios, read-only task board, opt-in telemetry, and a network-gated MCP stdio client.      |
| [23 — Spiral Safe Build Note](./23-spiral-safe-build-note.md)                                                     | Eight-repository integration, WebAuthn/Vault custody boundary, account usage, fixture demos, and explicit Nitro release gates.   |

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
published as launchable prototypes. Borrowed Brain is published with a synthetic-sample-only launch
boundary; The Last Press and Psych Lab are published as non-launchable concept records because the
source audit found unresolved authorization, settlement, and high-severity security issues.
FrescoPay remains held without a verified canonical app URL, and TadaDing remains held because its
registered deployment returns HTTP 404. Payload contains 19 evidence records plus four
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
and 100/100/100/100 on desktop, with CLS 0 on both. Build Note 002 is also live on the Static Site
and documents TurboPass at public commit `f18da56`: the exact FFI error-channel constraint, direct
use of the unchanged Ristretto crate, compatible v1/v2/v3 token lifecycle,
PostgreSQL/DynamoDB split, secret-free Temporal rotation history, complete local stack, 56 passing
Rust tests, and remaining production migration gates. Website commit `9c5b942` passed CI, CodeQL,
and checks-gated Render deployment. Its production Lighthouse result is 100/100/100/100 on both
mobile median and desktop, with CLS 0; full acceptance is recorded in
[17](./17-turbopass-rust-temporal-build-note.md). Build Note 003 is now live and documents Harness
Platform Stage 1, Milestone 1 at pinned public commit `a596fc5`: five dogfooded tasks, durable SQLite
events, the terminal viewer, one deterministic golden eval, the compiled process policy, hosted CI,
80 passing tests, and the boundaries that remain incomplete. Website commit `fd5c242` passed CI,
CodeQL, and checks-gated Render deploy `dep-daa501nlk1mc738icg20`. Production Lighthouse measured a
93 mobile performance median and 100 desktop performance, with 100 accessibility, best practices,
and SEO plus CLS 0 on every trace. Full acceptance is recorded in
[18](./18-harness-operator-loop-m1-build-note.md). Build Note 004 is live with one shared
architecture diagram and three product-flow diagrams for The Last Press, Psych Lab, and Borrowed
Brain. The final public snapshot contains five prototype records; only Borrowed Brain receives a new
external launch action. Website commit `b8b6c2d` passed CI and CodeQL, Payload deploy
`dep-daa5rlflk1mc738j6bm0` completed both publication migrations, and Static Site deploy
`dep-daa5te2jnfac73fkic3g` built 22 pages from verified five-prototype content revision
`2e8da5a6f350`. Full acceptance and the migration transaction-boundary fix are recorded in
[19](./19-three-lovable-prototypes.md). Build Note 005 now documents CryptoPal at pinned public commit
`55f7f00`: the original 2022 PlantUML, two independent blind-token hops, fixed 1 cUSD local Solana
flow, Rust/Wasm browser boundary, reproducible recorded walkthrough and local explorer, retry-safe
processor state, 33 passing API/web/Rust tests, guarded load harness, author-observed local session
results, and explicit custody, metadata, anychain, and interoperability limits. The initial website
commit `3d5ea1e` passed CI and CodeQL, and Render Static Site deploy
`dep-daa6t8n10e5c73bjntl0` generated 23 pages with five verified Build Notes. Its implementation,
clean-build correction, and production acceptance are recorded in [20](./20-cryptopal-build-note.md).
The recorded-walkthrough release in website commit `6c6963e` passed CI run `33348840529` and CodeQL
run `33348840477`; checks-gated Static Site deploy `dep-daadtjf10e5c73bpc0vg` generated the same 23
pages, verified the exact MP4 and WebP assets, and passed production page, immutable-cache,
same-origin media-policy, and byte-range acceptance.
Build Note 006 now documents Growth Program at pinned public commit `d944ee7`: the legacy
mainnet/devnet containment boundary, fixed-point and versioned v2 score model, consent and
correction lifecycle, provenance-only migration, owner-only evidence website, no-network browser
simulator, loopback-only real-validator lab, verification-session checks, and the deployment and
custody gates that keep v2 off devnet and mainnet. Website commit `65ae864` passed CI run
`33353599054` and CodeQL run `33353598490`; checks-gated Static Site deploy
`dep-daaf7ls9v7es73eb9fc0` generated 24 pages with six Build Notes and five Payload prototype
routes, then passed page, structured-data, feed, sitemap, CDN-cache, and security-header acceptance.
Its implementation and production record are in [21](./21-growth-program-v2-build-note.md).
Build Note 007 documents Harness Platform Stage 1, Milestone 2 at pinned public commit
`8f18f6d`: the zero-dependency `hello-service` calibration repository, SDK-owned scenario DSL,
read-only task board, opt-in OpenTelemetry bridge, hardened initialize-era MCP stdio client, 123
passing workspace tests, seven passing golden-service checks, and a separate live lane that
discovered 13 tools from one pinned official reference server in an independent local audit. The
separate GitHub compatibility workflow is configured but has no public run yet. Website commit
`b4d10ba` passed CI run `33412210406` and CodeQL run `33412210129`; checks-gated Static Site deploy
`dep-daaqe4ou01pc73fh0f7g` generated 25 pages with seven Build Notes and five Payload prototype
routes, then passed custom-domain page, structured-data, feed, sitemap, CDN-cache, and
security-header acceptance. Its implementation and production record are in
[22](./22-harness-eval-credibility-m2-build-note.md).
Build Note 008 is prepared from eight exact Spiral Safe repository pins. It documents the original
browser/backend custody contradiction, the WebAuthn-authorized Vault signing bridge, chain-specific
Solana and EIP-191 seams, scoped account API keys, usage reservation and outbox accounting, three
separate deployment evidence lanes, four synthetic fixture walkthroughs, 103 fresh passing tests,
and the 260-request control-plane smoke result without presenting it as a capacity benchmark. The
implementation and pending production record are in [23](./23-spiral-safe-build-note.md).
The expiring shared database, missing
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
