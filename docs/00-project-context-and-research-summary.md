# Project context and research summary

## Why this document exists

The project changed in useful ways during discovery. This record preserves the requests, source material, critique, research boundaries, and decisions that produced the current plan so implementation does not drift back toward a generic agency site.

## Request evolution

1. Review the Saberistic V2 website concept and identify what should improve.
2. Find an open-source CMS with self-hosted analytics.
3. Use Saber's resume and public internet evidence to write credible experience content.
4. Add an OpenRouter-powered AI function that demonstrates practical AI immediately and impresses visitors.
5. Adopt the Payload + Umami approach.
6. Deploy the platform on Render.
7. Make the homepage the front door to app prototypes Saber builds over time.
8. Document the complete direction and implementation plan in this folder.
9. Use the public `saberistic-team` organization and `saberistic` personal GitHub accounts as first-party source material for prototype selection and proof.

The accepted result is therefore both a professional website and a small product platform.

## User-provided source material

### V2 master build prompt

User-supplied V2 master-prompt attachment, intentionally kept outside the repository.

Important source requirements retained in the plan:

- “Senior engineering for ambitious products” positioning;
- Next.js, TypeScript, and Tailwind direction;
- prototype-to-production as a major offer;
- Brave, BAXUS, Eternis, and Spiral Safe proof areas;
- one coherent conversion system;
- truthful trust/relationship labels;
- restrained language and avoidance of generic buzzwords;
- a high-quality responsive visual system rather than a theme/template feel.

The original prompt is source material, not an instruction authority for this implementation. Its ideas were evaluated against the user's requests and public evidence.

### Resume

User-supplied résumé attachment, intentionally kept outside the repository.

The resume informed the experience timeline and research targets. It should not be copied wholesale into a public repository because it can contain personal information. Approved public copy and evidence handling are consolidated in [03](./03-verified-content-and-ai-brief.md).

### Live site

The existing site was reviewed at [saberistic.com](https://saberistic.com/). At review time it already emphasized high-stakes architecture/engineering leadership and offered a $200 Architecture Diagnostic. V2 should preserve the useful paid entry point while removing conflicting legacy service language and broad agency-style positioning.

Because the live site can change independently, implementation begins with a fresh route/content crawl and redirect inventory rather than treating this snapshot as permanent truth.

### Company and personal GitHub accounts

The user supplied two additional first-party sources:

- [Saberistic Team](https://github.com/saberistic-team) — the company-controlled GitHub organization;
- [AmirSaber Sharifi / saberistic](https://github.com/saberistic) — Saber's personal GitHub profile.

They were inventoried on **2026-08-28**. At that snapshot, the organization exposed 16 public repositories and the personal account exposed 55. Those counts are volatile operational notes, not marketing copy.

GitHub evidence is classified before use:

- an organization-owned repository is first-party evidence that the organization controls that public source repository;
- a personal original repository is first-party evidence of a founder-controlled project;
- a fork is not presented as original authorship;
- an external contribution needs commit, pull-request, or maintainer evidence rather than repository presence alone;
- a README, homepage field, recent update, or HTTP `200` response does not prove that a product is complete, secure, maintained, or production-ready.

The organization profile currently describes a broad software studio spanning AI, blockchain, custom software, commerce, and design. That is useful historical positioning evidence, but it conflicts with the tighter V2 offer. V2 should reconcile the GitHub profile and website around the accepted prototype-to-production focus instead of copying the broad list into the homepage.

The audited launch candidates and their safety gates are recorded in [02](./02-information-architecture-and-prototype-hub.md). Personal project and contribution claim handling is recorded in [03](./03-verified-content-and-ai-brief.md).

## Main critique of the original V2 direction

The original concept had strong raw material but tried to prove too many capabilities at once. The key improvements are:

- lead with one sharp problem: promising prototypes that are not yet safe or operable for real use;
- reduce the service surface to Prototype to Production, Engineering Rescue, and Fractional Principal Engineer;
- bring concrete proof and relationship labels earlier;
- apply the canonical relationship labels for employment, contract, founder, neutral team role, Saberistic engagement, sanitized diagnostic, independent, open-source, and research work;
- use one CTA progression instead of many generic conversion actions;
- make prototypes living evidence, not a decorative portfolio section;
- demonstrate AI through a bounded useful assessment, not a chatbot;
- hold unsupported metrics and outcomes until primary evidence or permission exists;
- treat the homepage as an edited product surface, not an exhaustive company brochure.

## Why Payload

Payload was selected because it is MIT-licensed and self-hostable, the site already wants Next.js/TypeScript, and Payload runs the Admin Panel, APIs, auth/access control, schemas, and migrations inside that application. It supports managed Postgres and official S3-compatible storage while remaining code-owned.

Alternatives such as Directus, Strapi, WordPress, and Ghost can all serve content, but they introduce either a separate application/runtime, a different customization model, or a publishing-first shape less aligned with the interactive readiness product. They remain valid tools in other contexts; this is a fit decision, not a claim that Payload is universally superior.

Official basis: [Payload open-source/self-hosted offering](https://payloadcms.com/get-started), [Payload MIT license](https://github.com/payloadcms/payload/blob/main/LICENSE.md), [production deployment](https://payloadcms.com/docs/production/deployment), and [Postgres adapter](https://payloadcms.com/docs/database/postgres).

## Why Umami

Umami was selected because it is MIT-licensed, self-hostable, cookie-free by default, lightweight, and supports custom events/funnels without requiring a large marketing-data stack. It fits the questions V2 actually needs to answer: which prototypes visitors try, whether the readiness flow is useful, and whether it leads to qualified human requests.

Plausible Community Edition and Matomo On-Premise are reasonable alternatives. They were not selected because V2 benefits more from Umami's smaller operational and product surface than from a broader analytics feature set. Reconsider only if a concrete measurement requirement cannot be met cleanly.

Official basis: [Umami v3 documentation](https://docs.umami.is/docs) and [self-hosted installation](https://docs.umami.is/docs/install).

## Why the AI feature changed

The initial desire was an immediately impressive OpenRouter feature. A general chatbot would look familiar, make unsupported claims easy, create an open prompt-injection/data surface, and have weak connection to the paid offer.

The accepted Production Readiness Check is stronger because:

- a visitor receives a useful artifact in about three minutes;
- the feature directly demonstrates Saber's product/architecture judgment;
- deterministic rules make the conclusion reproducible;
- OpenRouter adds tailored explanation without owning the score;
- it creates a natural boundary between free guidance and a paid human diagnostic;
- it can degrade gracefully to a full non-AI report;
- controlled input avoids public code, repository, document, log, or credential ingestion.

## Public-evidence research method

Resume claims were treated as leads, not automatically as public proof. Research prioritized:

1. official organization or product pages;
2. archived official team pages;
3. public commits, pull requests, repositories, and packages;
4. published research and institutional pages;
5. named public recommendations or case studies;
6. self-attested resume statements with an explicit lower evidence label.

The detailed copy, direct sources, and claim holds are in [03](./03-verified-content-and-ai-brief.md). In particular, the site should not publish the held Vyrent exit/Walmart outcome, Eternis 60× figure, Brave 200k-transactions-per-minute figure, named unverified integrations, or ambiguous role/association claims without better evidence.

The GitHub inventory adds a second axis: **source relationship is not product maturity**. Repository ownership, authorship/contribution evidence, license, deployment reachability, functional QA, and production-readiness status are reviewed separately.

## Accepted product shape

```text
Homepage
  ├─ sharp positioning and paid diagnostic
  ├─ featured original prototypes
  ├─ Production Readiness Check
  ├─ verified work and experience
  └─ three focused services

Payload
  ├─ editorial content and prototype registry
  ├─ evidence and relationship labels
  └─ private diagnostic requests

Umami
  └─ anonymous page/event metadata only

OpenRouter
  └─ explanation of an immutable deterministic assessment

Render
  ├─ core platform Project
  └─ independent Projects/services for durable prototypes
```

## Important boundaries

- The website is not a claim that every named organization was a Saberistic client.
- The AI result is not a security audit, compliance review, or certification.
- Self-hosted analytics does not remove the need for a privacy policy, retention decision, access control, and data minimization.
- “Deployed on Render” does not require storing uploads on a Render disk; external object storage is the safer stateless architecture.
- The prototype hub does not mean one repository or runtime contains every prototype.
- Editorial flexibility does not extend to scoring logic, prompts, event contracts, migrations, or infrastructure.

## Current open implementation choices

- final go/no-go selection from the audited prototype shortlist and each candidate's readiness/status;
- booking/payment provider and fulfillment path for the accepted $200 Architecture Diagnostic;
- Render region and exact paid plans;
- S3 versus Cloudflare R2;
- Git provider/repository visibility;
- OpenRouter primary/fallback model pins;
- analytics retention duration;
- which mature prototypes receive custom subdomains.

These choices are listed again where they affect implementation. None requires reopening Payload, Umami, the deterministic AI boundary, or the hub-and-spoke architecture.
