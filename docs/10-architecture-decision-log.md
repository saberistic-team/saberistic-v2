# Architecture decision log

These decisions are accepted for V2. Reopen one only when a listed trigger or materially new evidence appears. “Cheaper” or “more popular” by itself is not enough; compare the complete operational consequence.

## ADR-001 — Payload as CMS

**Status:** Accepted

Use Payload inside the Next.js application rather than a detached SaaS or WordPress-style CMS.

**Why:** TypeScript schema ownership, admin/API/auth in the same codebase, Postgres support, drafts, access control, and self-hosting fit a site that is itself a technical product.

**Consequence:** CMS upgrades and security are our responsibility. Next.js/Payload compatibility must be pinned.

**Revisit when:** editorial scale requires a completely separate content organization, or Payload cannot support a critical workflow after a prototype.

## ADR-002 — One web runtime for Next.js and Payload

**Status:** Accepted

The public frontend and Payload admin/API deploy as `saberistic-web`.

**Why:** This is Payload v3's native shape and avoids network/API duplication.

**Consequence:** `/admin` shares deployment fate with the public site, though access/data remain protected.

**Revisit when:** independent scaling, compliance boundaries, or release ownership demonstrably require separation.

## ADR-003 — Render Postgres, separate instances for Payload and Umami

**Status:** Accepted

Use two managed production databases.

**Why:** Isolates credentials, migrations, performance, retention, restore, and deletion.

**Consequence:** Higher baseline cost than two logical databases on one instance.

**Revisit when:** prelaunch budget cannot support two paid instances; any shared setup is explicitly temporary and must document the coupled recovery boundary.

## ADR-004 — Object storage, not a Render disk, for media

**Status:** Accepted

Use Payload's official S3 adapter with S3 or R2.

**Why:** Render's default filesystem is ephemeral. A persistent disk limits a service to one instance and prevents normal zero-downtime deploy behavior.

**Consequence:** One external storage provider and its credentials/CORS/lifecycle must be operated.

**Revisit when:** Render offers shared object storage with equivalent scaling and durability, or the site removes uploads entirely.

## ADR-005 — Self-hosted Umami

**Status:** Accepted

Run Umami as an isolated image-backed Render service.

**Why:** Simple privacy-first product analytics, data ownership, lightweight tracker, custom events/funnels, and no need for a large marketing analytics suite.

**Consequence:** We own upgrades, database growth, access, retention, and recovery. Self-hosted retention is not automatically finite.

**Revisit when:** product requirements need capabilities Umami cannot provide without compromising the privacy model, or operating it costs more than an equivalent compliant service.

## ADR-006 — Hub-and-spoke prototypes

**Status:** Accepted

Payload stores prototype metadata; each app deploys independently.

**Why:** Experiments need technical freedom and failure isolation. The main site should remain stable as prototype stacks change.

**Consequence:** Multiple repositories/services/domains need light operational standards.

**Revisit when:** several prototypes genuinely share one product/runtime and benefit from consolidation.

## ADR-007 — Deterministic score, AI explanation

**Status:** Accepted

The policy engine owns readiness, scores, blockers, and next-step mapping. OpenRouter only explains and prioritizes within that immutable result.

**Why:** The feature remains testable, safe, honest, and useful during model failure.

**Consequence:** Rules require deliberate versioning and human maintenance; the model cannot hide gaps in the policy.

**Revisit when:** validated evidence shows a different bounded model architecture can be equally reproducible and auditable.

## ADR-008 — No repository/code/log ingestion in public MVP

**Status:** Accepted

Use controlled answers and one short optional symptom field.

**Why:** Immediate usefulness without creating a high-risk code/confidential-data processing product.

**Consequence:** Results are directional and based on self-report.

**Revisit when:** a separately authenticated product has clear consent, isolation, retention, deletion, provider, and threat-model design.

## ADR-009 — OpenRouter privacy and budget fail closed

**Status:** Accepted

Require structured output, compatible providers, data-collection denial, ZDR, model/provider allowlists, limited key, server-side rate limits, and deterministic fallback.

**Why:** Availability or price must never silently weaken privacy or correctness.

**Consequence:** Some assessments will use fallback prose when no compliant endpoint is available.

The public MVP does not cache manifests or reports server-side; Key Value contains only expiring abuse/concurrency state.

**Revisit when:** provider/data policy changes or a direct provider offers a materially simpler equivalent control plane.

## ADR-010 — No personal or assessment content in Umami

**Status:** Accepted

Track only allowlisted low-cardinality event metadata.

**Why:** Analytics does not need names, answers, prompts, reports, company/website, or report IDs to guide product decisions.

**Consequence:** Lead quality is reviewed outside Umami and only aggregated manually.

**Revisit when:** never for raw sensitive content; a new anonymous metric may be added only with documented necessity and privacy review.

## ADR-011 — Render Project with staging and protected production

**Status:** Accepted

Manage the core resources through one Blueprint and separate isolated environments.

**Why:** Reviewable infrastructure, reproducibility, scoped configuration, and reduced staging-to-production mistakes.

**Consequence:** Repository permissions can affect protected infrastructure; branch review is part of production access control.

**Revisit when:** core services move to a different platform or organizational ownership requires multiple Blueprints. Never let two Blueprints manage one resource.

## ADR-012 — Direct Postgres initially; PgBouncer on evidence

**Status:** Accepted

Use internal direct database URLs at launch. Render's integrated PgBouncer is a measured scaling option.

**Why:** Small long-running services do not automatically benefit from pooling, and transaction pooling is incompatible with session-level database behavior.

**Consequence:** Connection counts must be monitored as services scale.

**Revisit when:** connections approach plan limits or bursty clients create measurable connection overhead.

## ADR-013 — No Payload worker until background work exists

**Status:** Accepted

MVP avoids scheduled publishing and queued jobs. Add a Render worker with Payload's jobs runner when link checks, schedules, or notifications are implemented.

**Why:** Avoid paying for and monitoring an idle component while preserving the correct future boundary.

**Consequence:** Editors cannot depend on scheduled jobs in MVP.

**Revisit when:** the first accepted feature requires reliable asynchronous execution.

## ADR-014 — Git owns behavior; Payload owns editorial content

**Status:** Accepted

Question IDs, readiness rules, prompts, schemas, migrations, event names, security policy, and infrastructure stay in Git. Payload owns copy, evidence, pages, prototype metadata, and SEO.

**Why:** Behavior changes need tests and code review; content changes need editorial workflow.

**Consequence:** Some “copy-like” readiness text is split: labels/help in Payload, scoring/action semantics in code.

**Revisit when:** an editor requirement can be safely represented without changing product or security behavior.

## ADR-015 — Evidence before marketing claims

**Status:** Accepted

Every material work claim has an honest relationship label and evidence state. Claims on hold remain unpublished.

**Why:** Credibility is the product; an impressive unsupported metric weakens the entire site.

**Consequence:** Some resume statements are softened or omitted until primary proof/permission exists.

**Revisit when:** new primary evidence or explicit authorized attribution is available.

## ADR-016 — Fixed public conversion vocabulary

**Status:** Accepted

The paid entry offer is **Architecture Diagnostic — $200** with CTA **Start the Architecture Diagnostic**. Readiness results use only `self_serve`, `architecture_diagnostic`, or `engineering_rescue_inquiry` as next-step IDs. Direct service inquiries use a separate private contact form with `prototype_to_production`, `engineering_rescue`, or `fractional_principal_engineer` as service-interest values; these never enter the model result contract. The hero uses **Check production readiness** and **Explore prototypes**.

**Why:** Stable names prevent schemas, analytics, prompts, and copy from describing different products.

**Consequence:** “Prototype Review,” “Architecture Review,” “Human Prototype Review,” “Rescue Sprint,” and generic “Start a project” CTAs are not public V2 labels. Payload selects stable Git-owned public-action IDs; editors cannot override conversion labels or destinations with arbitrary text.

**Revisit when:** the user deliberately changes the offer or price and updates copy, CMS defaults, analytics, model contract, and fulfillment together.

## ADR-017 — Independent daily database-export cron jobs

**Status:** Accepted

Payload and Umami each receive a separate Render Cron Job that creates a daily logical export through the database's direct internal connection and uploads it to independent encrypted object storage.

**Why:** Render point-in-time recovery and dashboard exports are valuable, but an independently retained, monitored logical export provides a second recovery path. Separate jobs keep credentials, failures, retention, and evidence isolated.

**Consequence:** The final Blueprint includes two small scheduled services, UTC schedules, least-privilege bucket credentials, upload verification, failure/late-object alerts, and restore drills. They are required before production launch rather than deferred maintenance.

**Revisit when:** a tested managed backup service provides equivalent independent retention, least privilege, alerts, and restore evidence with lower operational risk.

## ADR-018 — GitHub is a source registry, not deployment truth

**Status:** Accepted

Use the supplied company organization and personal profile to seed evidence sources and draft prototype records. Preserve whether each repository is organization-owned, personal-original, a fork, or evidence of an external contribution.

**Why:** Public source provides valuable, inspectable proof and a strong project inventory, but repository ownership, authorship, licensing, reachability, functionality, and production readiness are different facts. A README, recent commit, homepage URL, star count, or HTTP success cannot safely collapse them into one “live” claim.

**Consequence:** GitHub ingestion never auto-publishes a Payload record or assigns `alpha`, `beta`, or `live`. Launch status requires a separate functional test and the documented security, privacy, data, accessibility, analytics, monitoring, rollback, and support gates. Forks require specific contribution evidence before they appear as Saber's work.

**Revisit when:** only the import mechanism may change; the separation between provenance and maturity remains a trust requirement.

## Pending implementation choices

These do not reopen the architecture:

- AWS S3 versus Cloudflare R2;
- Render region and exact plans;
- Git provider and repository visibility;
- final go/no-go selection from BackThen, FrescoPay, TadaDing, and the payment-disabled Story Sprout fallback;
- Architecture Diagnostic booking/payment provider and fulfillment path;
- analytics retention duration;
- specific pinned OpenRouter primary/fallback models;
- whether `PRIVATE_MODE=1` is enabled for Umami after validating required favicon/location behavior;
- whether mature prototypes use custom subdomains or Render URLs.
