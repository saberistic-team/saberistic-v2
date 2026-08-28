# Saberistic V2 — verified experience content and AI feature brief

Prepared from AmirSaber Sharifi's supplied résumé, public company pages, public code, and independent public references. This document is a content and implementation source of truth; it is not evidence that the live site has been updated.

## Recommended direction

Own one sharp position:

> Saberistic turns promising prototypes into production systems—and steps in when difficult software needs senior engineering judgment.

The résumé supports a credible story around privacy, payments, infrastructure, distributed workflows, security, and technical leadership. It supports “AI-era production engineering” more strongly than it supports a broad claim of being an AI research or model-development studio.

The signature AI experience should be a **Production Readiness Check**, not a chatbot. It should visibly demonstrate how Saberistic works: explicit controls establish what is true, AI explains the implications, and a senior engineer remains accountable for the conclusion.

## Evidence and attribution rules

Use these three canonical claim states in the CMS.

| State | Meaning | Website use |
| --- | --- | --- |
| `publicly_corroborated` | Official company/product page, public code, academic page, or independent named reference directly supports the claim | Homepage, Work, About, proposals |
| `founder_provided` | Supplied résumé or AmirSaber-controlled profile supports the claim, but no independent role-specific source was found | About/timeline and carefully worded Work detail after AmirSaber approves it |
| `hold` | Material outcome, metric, acquisition, or client relationship is not sufficiently supported | Do not publish until documentary evidence or permission is added |

Every experience item also needs one canonical relationship value and its exact public label:

| Internal value | Public label |
|---|---|
| `employment` | Prior employer role |
| `contract` | Contract role |
| `founder` | Founder venture |
| `team_role` | Team role |
| `saberistic_engagement` | Saberistic engagement |
| `sanitized_diagnostic` | Sanitized diagnostic |
| `independent` | Independent project |
| `open_source` | Open-source contribution |
| `research` | Research |

Never place those categories in an unlabeled “clients” or “trusted by” logo strip.

### GitHub source and repository provenance

Treat account control, repository provenance, and the exact authorship evidence as separate facts. A public repository can corroborate concrete facts visible in its code, history, license, or README; it does not by itself prove production deployment, security review, adoption, commercial use, performance, or sole authorship.

Use these canonical `repositoryProvenance` values for GitHub evidence:

| Value | Meaning | Safe evidence use |
| --- | --- | --- |
| `organization_owned` | Repository is published under the [Saberistic team organization](https://github.com/saberistic-team) or another identified organization | Supports that the organization publishes or maintains the linked code. Attribute a person's work only when commits, pull requests, or another source identify that contribution. |
| `personal_original` | Repository is under [AmirSaber's personal account](https://github.com/saberistic), is not marked as a fork, and the repository history supports treating it as an original project | Supports a carefully scoped independent-project or open-source implementation claim. It is still first-party evidence, not independent validation, and `fork: false` does not establish sole authorship. |
| `fork` | GitHub identifies the repository as a fork or links it to an upstream repository | Supports experimentation or maintenance only. Do not present the repository as an authored project; cite AmirSaber's discrete commits or pull requests when those are the relevant evidence. |
| `external_contribution` | A commit or pull request by `saberistic` appears in a third-party repository | Supports only the change and contribution scope shown by the linked commit or pull request. It does not support authorship of the repository, ownership of the product, or responsibility for the complete system. |

GitHub account pages require an additional source-strength caveat. Personal profile fields, organization/company profile fields, pinned-repository selections, and a profile README are founder-provided or self-authored account content. Record those statements as `self-attested` / `founder_provided`, not as independent corroboration. Repository code and history may separately provide `first-party-public` or `public-contribution` evidence for exact technical facts.

## Homepage copy

### Hero

Eyebrow:

> SABERISTIC / PROTOTYPE → PRODUCTION

Headline:

> You built the prototype. We make it production-ready.

Supporting copy:

> Senior architecture and hands-on engineering for AI and software products that need to survive real users, sensitive data, and operational reality.

Primary CTA:

> Check production readiness

Secondary CTA:

> Explore prototypes

Trust line:

> Founder-led engineering experience across Brave, BAXUS, Eternis, Spiral Safe, and open-source security systems. Previous-employer, contract, founder, and team work is labeled clearly.

### Situation cards

Keep the four paths, but make their language and destination specific.

1. **I built a prototype** — Find the gaps between demo and production. CTA: `Check production readiness`
2. **I need to ship** — Design and build the critical product path. CTA: `Explore Prototype to Production`
3. **Something is broken** — Diagnose architecture, reliability, security, or cost. CTA: `Explore Engineering Rescue`
4. **I need senior leadership** — Add hands-on principal-level judgment without a permanent hire. CTA: `Explore Fractional Principal Engineer`

### Proof introduction

Headline:

> Built inside systems where privacy, money, and reliability matter.

Supporting copy:

> Saberistic is led by AmirSaber Sharifi, a hands-on engineer and architect with more than a decade of experience across privacy-preserving products, payments, marketplace infrastructure, trusted execution, cloud systems, and technical leadership.

Do not immediately repeat a long technology list. Let the case studies prove the range.

## Homepage proof cards

### Brave

Relationship label: `PRIOR EMPLOYER ROLE`

Role: `SENIOR SOFTWARE ENGINEER`

Title:

> Privacy-aligned advertising and rewards infrastructure

Copy:

> Worked across backend services and product interfaces supporting Brave's privacy-preserving advertising and rewards ecosystem. Public contribution history includes advertiser workflows and reporting in `ads-ui`, plus payment and credential-related changes in `bat-go`.

Proof links:

- [Brave Ads privacy model](https://brave.com/privacy/browser/)
- [Archived official Brave team page naming AmirSaber as Senior Software Engineer](https://web.archive.org/web/20190531130820/https://brave.com/about/)
- [Brave `ads-ui`](https://github.com/brave/ads-ui)
- [Public Brave Ads pull request](https://github.com/brave/ads-ui/pull/1)
- [Example campaign-pricing contribution](https://github.com/brave/ads-ui/commit/ed0b287ea224a6db62f6f499e9a7cf281024e2c5)
- [Brave `bat-go`](https://github.com/brave-intl/bat-go)
- [Public BAT credential-support pull request](https://github.com/brave-intl/bat-go/pull/1049)
- [Example balance-check contribution](https://github.com/brave-intl/bat-go/commit/839ba8613fe827b189382927ba62abd548863f65)
- [Public privacy/challenge-bypass contribution](https://github.com/brave-intl/challenge-bypass-server/pull/93)
- [Brave's documentation of the privacy-preserving credential architecture](https://github.com/brave/brave-core/blob/master/docs/premium_account_privacy.md)

Safe detailed contribution themes, subject to AmirSaber's approval: Go, Node.js, PostgreSQL, React/Redux, scale and functional testing, anti-fraud work, payout operations, and privacy-preserving APIs.

Do not publish unverified throughput, fraud-dollar, user-count, or transaction-count metrics.

### BAXUS

Relationship label: `PRIOR EMPLOYER ROLE`

Role: `VP OF ENGINEERING`

Title:

> Early architecture for a marketplace joining physical assets and digital ownership

Copy:

> Helped establish the architecture behind BAXUS's early marketplace: durable workflows, cloud deployment, microservice communication, and Solana/Metaplex integration for digitally represented collectible spirits.

Expanded case-study contribution:

> A former colleague publicly credits AmirSaber with early platform architecture, Temporal-based transaction workflows, Docker/Kubernetes/Pulumi deployment on GCP, open-source NestJS–Temporal work, and Solana/Metaplex integration.

Proof links:

- [BAXUS product and marketplace](https://www.baxus.co/about)
- [BAXUS terms describing Solana-based collectible assets](https://baxus.co/termsconditions)
- [Public BAXUS Temporal contribution](https://github.com/BAXUSNFT/baxus-temporal/commit/393bf8c137a1a98b3380effab7f371176ad2480a)
- [Public BAXUS validator contribution](https://github.com/BAXUSNFT/baxus-validator/commit/b6b5a52534ca5d0e5ecb694d2380b9c45c5b77f3)
- [Named colleague recommendation on AmirSaber's public profile](https://www.linkedin.com/in/saberistic)

Avoid implying that today's complete BAXUS product or architecture is solely AmirSaber's work.

### Eternis

Relationship label: `TEAM ROLE`

Title:

> Trusted execution for auditable data workflows

Copy:

> Contributed to TLSNotary tooling, load testing, Nitro Enclave/EKS deployment, and remote-attestation components for secure, auditable data workflows.

Proof links:

- [EternisAI's public Enclaver architecture](https://github.com/EternisAI/enclaver/blob/eternis/docs/architecture.md)
- [`@eternis/tlsn-js`, which lists `saberistic` as a maintainer](https://www.npmjs.com/package/@eternis/tlsn-js)
- [Public Eternis load-testing contribution](https://github.com/EternisAI/notary-k6/commit/98466c3242354f0fe9538f62ae8252d8bcfb7546)
- [Public Nitro/EKS adaptation pull request](https://github.com/EternisAI/nitriding-daemon/pull/1)
- [Public remote-attestation contribution](https://github.com/EternisAI/remote-attestation-verifier/commit/dfbd7ffc1843aa523854bf3bc2d2701b00617d6b)
- [AWS Nitro Enclaves](https://aws.amazon.com/ec2/nitro/nitro-enclaves/)
- [TLSNotary's public Rust implementation](https://github.com/tlsnotary/tlsn)

The résumé describes an employer relationship and moving the core from MPC toward TEE in Rust, but the employer relationship, transition, and formal title were not independently verified. The homepage uses the neutral `TEAM ROLE` supported by public maintainer/contribution evidence; reserve the employer claim for the founder-provided About timeline after approval. Do not publish the third-party “60×” performance claim or named integrations unless a primary source, benchmark, or employer permission is added.

### Spiral Safe

Relationship label: `INDEPENDENT PROJECT`

Title:

> Multichain key management with enclave-backed signing

Copy:

> Designed and open-sourced a security-focused system for cryptographic operations across Solana and Ethereum, combining AWS Nitro Enclaves with HashiCorp Vault and Consul.

Use `FOUNDER VENTURE` only after a public organization record or approved documentary evidence supports that relationship. The public repositories support the safer independent-project/open-source description now.

Proof links:

- [Spiral Safe public organization and architecture](https://github.com/Spiral-Safe)
- [Personal-original, non-fork public service repository](https://github.com/saberistic/solana-secrets-engine)

The repository supports a scoped description of `solana-secrets-engine` as an open-source HashiCorp Vault plugin for Solana account creation and signing. It does not independently establish the Spiral Safe relationship or the broader multichain product claim. Do not claim an independent security audit, enterprise adoption, production deployment, or customer usage without separate evidence.

## Personal-original technical proof candidates

Authenticated GitHub metadata reviewed on 2026-08-28 identifies the following repositories as public, personal-original repositories with `fork: false`. That classification makes them candidates for open-source proof cards, build notes, or the Prototype hub; it does not make them approved interactive launch apps, currently maintained, production-ready, secure, or solely authored. Before featuring one as `beta` or `live`, run the repository, review its dependency and secret-handling posture, confirm its current license and maintenance state, and validate every user-facing claim.

### `solana-secrets-engine`

- Evidence: [public repository](https://github.com/saberistic/solana-secrets-engine)
- Provenance: `personal_original`; non-fork.
- Safe claim: “An open-source HashiCorp Vault plugin prototype for creating Solana accounts and signing with them.”
- Boundary: the public code supports the implementation description, not a claim that it has been audited, deployed in production, adopted by customers, or proven safe for custody. Do not assert a license until the repository's license file or GitHub license metadata is captured in the evidence record.

### `temporal-web-api`

- Evidence: [public repository](https://github.com/saberistic/temporal-web-api)
- Provenance: `personal_original`; non-fork; Apache-2.0.
- Safe claim: “A public Apache-2.0 prototype published as `temporal-web-api`.” Treat any more specific architecture or capability description as pending code-level validation.
- Boundary: repository existence and source code support a prototype/open-source claim only. Do not infer production deployment, current maintenance, workflow durability under load, adoption, or performance from the repository name or public visibility.

### `superpull-bonding-curve`

- Evidence: [public repository](https://github.com/saberistic/superpull-bonding-curve)
- Provenance: `personal_original`; non-fork; Apache-2.0.
- Safe claim: “An open-source experimental bonding-curve prototype.”
- Required warning wherever it is surfaced: **Experimental, not audited, and use at your own risk.** The repository README explicitly states this boundary.
- Boundary: do not describe it as production-ready, secure, financially safe, audited, or suitable for handling real funds. A public prototype card must not imply endorsement or a security guarantee.

## Additional experience for the About page or timeline

### Fin

Relationship label: `PRIOR EMPLOYER ROLE`

Role: `SENIOR STAFF ENGINEER`

Draft for approval:

> At Fin, worked on developer tooling and onboarding, Rust diagnostics, KYC and on/off-ramp integrations, and Terraform-managed infrastructure on AWS.

Public context: Fin describes a global payments platform using stablecoin and local rails, with compliance, wallets, and on/off-ramp capabilities.

- [Fin product](https://www.fin.com/)
- [Fin privacy policy describing blockchain transfers, KYC/KYB, and on/off-ramps](https://www.fin.tech/privacy)

The detailed personal contribution is founder-provided and should be approved before publication.

### GlueFi

Relationship label: `CONTRACT ROLE`

Role: `CHIEF ARCHITECT · FOUNDER-PROVIDED`

Draft for approval:

> Designed treasury-bill infrastructure around Temporal workflows, built load-testing tooling, managed AWS infrastructure through CDK, and designed local and deployed analytics paths using Trino and Athena.

Keep this on the timeline until a public technical source, client permission, or sanitized architecture artifact supports a full case study.

No public source connecting AmirSaber to GlueFi was found. Confirm that this is the same current organization and add a contract, company reference, or permission before publishing the company name and title.

### Designity

Relationship label: `CONTRACT ROLE`

Role: `FULL STACK DEVELOPER`

Draft for approval:

> Contributed full-stack engineering to Designity's public TypeScript services, workflow automation, Airtable integrations, and blockchain-related platform components.

Public proof:

- [Archived official Designity team page](https://web.archive.org/web/20240319063835/https://www.designity.com/team)
- [Designity public services repository](https://github.com/designitycom/web-services)
- [Public commits authored by `saberistic`](https://github.com/designitycom/web-services/commits/develop/?author=saberistic)
- [Superteam Open Source listing the organization-growth contract and AmirSaber as its contact](https://oss.superteam.fun/)

The archived employer page uses the title Full Stack Developer; the résumé uses Web4 Engineer. Prefer the employer-controlled title publicly unless Designity authorizes the other wording. The public code supports TypeScript/Node, Temporal, Airtable, Docker, and Solana-related work. Softr and Web3Auth details are founder-provided.

### Vyrent

Relationship label: `TEAM ROLE`

Safe draft:

> Worked on the Vyrent team, developing a luxury-watch subscription marketplace and contributing to its mobile/web product.

Public context:

- [Vyrent company page](https://www.linkedin.com/company/vyrent)
- [Designity case study identifying Amir as a Vyrent team member](https://www.designity.com/case-studies/an-innovative-company-with-a-common-frustration)

The résumé's serverless and Salesforce details are founder-provided. The co-founder title needs confirmation beyond the résumé.

**Hold:** “Exited successfully after selling part of the technology to Walmart.” No evidence of a Walmart acquisition or exit was found. Designity's case study says Vyrent planned jewelry rental through a Walmart collaboration; that is not evidence that the collaboration occurred or that technology was sold. Publish an exit only after adding a contract, announcement, buyer confirmation, or other documentary evidence.

### Verdocs

Relationship label: `TEAM ROLE`

Safe public wording:

> Supported Verdocs during its early transition from Realster to an embedded e-signature platform.

- [Public Verdocs transition post naming AmirSaber among the stakeholders](https://www.linkedin.com/posts/parhamalizadeh_esignature-plg-activity-6568128540041113600-Q3Cs)
- [Verdocs](https://verdocs.com/)

The Lead Engineer title, five-engineer team, infrastructure responsibilities, and API work are founder-provided. “Stakeholder” does not independently establish a job title or sole technical authorship.

### HCapital / Yalber

Relationship label: `PRIOR EMPLOYER ROLE`

Safe public wording:

> Software Engineer at HCapital, part of the group operating under the Yalber brand.

The YODA Lab alumni record independently names HCapital as AmirSaber's next role. Frontend, Node.js, MongoDB, Salesforce, and DocuSign contribution details are founder-provided. Avoid the simplified phrase “Yalber, formerly HCapital,” which does not precisely describe the legal/brand relationship.

- [YODA Lab alumni record](https://yeoh-lab.wustl.edu/people/)
- [Historical Yalber release describing the H-Capital relationship](https://www.prnewswire.com/news-releases/yalber-is-setting-the-record-straight-300598983.html)

### Education and early research

Relationship label: `RESEARCH`

Draft for approval:

> AmirSaber earned an M.S. in Computer Science in 2014. His graduate project, DeepDepth, explored how to visualize social-network data.

Proof links:

- [YODA Lab former students and DeepDepth project](https://yeoh-lab.wustl.edu/people/)
- [NMSU faculty record listing the 2014 Computer Science M.S.](https://www.cs.nmsu.edu/~hcao/cao.pdf)
- [Public DeepDepth repository](https://github.com/saberistic/DeepDepth)
- [DeepDepth project report source](https://github.com/saberistic/DeepDepth/blob/master/public/documents/report/report.tex)

Expanded safe wording:

> Built DeepDepth as a graduate capstone: Java-based social-data collection, Hadoop/Hive analysis, and a configurable Node/Express/Angular visualization interface.

## About-page copy

> Saberistic is led by AmirSaber Sharifi, a software architect, engineering leader, and lifelong builder. For more than a decade, he has worked on products where mistakes are expensive: privacy-preserving advertising and rewards, global payments, digitally represented assets, trusted execution, cloud infrastructure, and secure key management.
>
> His work has moved between staff engineering, early-stage architecture, technical leadership, contract engagements, and founder-led products. The common thread is hands-on judgment: understanding the product, finding the critical system boundary, and then implementing what the architecture requires.
>
> Saberistic is built around a simple belief: complex technology becomes manageable when product thinking, architecture, and implementation are treated as one problem.

Short bio:

> AmirSaber Sharifi is a senior engineer and architect with experience spanning Brave, BAXUS, Fin, Eternis, and founder-led security products. He works across distributed systems, payments, privacy, cloud infrastructure, trusted execution, and production software delivery.

## Claims that should not appear yet

- Any Vyrent technology sale or exit involving Walmart.
- “60× faster” at Eternis.
- “200,000 transactions per minute” at Brave.
- Named Eternis integrations with Robinhood, Uber, SSA, X, Reddit, or similar services.
- Revenue, transaction volume, fraud prevented, customer count, or adoption metrics not tied to a primary source and the exact period of AmirSaber's involvement.
- “Trusted by Brave/BAXUS/Fin/Eternis.” Use “experience at” and relationship labels.
- “Saberistic client” for any former employer or founder venture.
- “Audited,” “enterprise-grade,” “production-proven,” or “zero-knowledge” as a product outcome unless the supporting artifact is linked.
- Any fork presented as an authored Saberistic project, or an entire third-party repository attributed to AmirSaber because it contains one contribution.
- Any public repository presented as production-ready, actively maintained, adopted, secure, or audited without separate, claim-specific evidence.
- Any wording that weakens or omits the experimental/not-audited warning for `superpull-bonding-curve`.
- “CTO of Designity”; the archived employer page identifies AmirSaber as a Full Stack Developer.
- A formal GlueFi role or company association until a contract, company source, or permission is added.

## Signature AI feature: Production Readiness Check

### Visitor-facing proposition

Card headline:

> Is your prototype ready for real users?

Supporting copy:

> Answer a few architecture questions. Get a readiness level, hard blockers, unknowns, a 48-hour plan, and a two-week production plan.

Trust microcopy:

> 3 minutes. No code upload. Directional assessment—not a security or code audit.

Privacy microcopy:

> Do not paste source code, credentials, logs, customer data, client names, or confidential project details.

CTA:

> Check my prototype

Result-page principle:

> Scored by explicit controls. Explained by AI.

This line is important. The app should not ask a model to invent a readiness score. A versioned policy engine calculates the score and blockers from validated answers. OpenRouter turns that bounded result into a clear, relevant plan.

### Five assessment sections

1. Stage and architecture
2. Authentication, authorization, and data sensitivity
3. Delivery, tests, and human review
4. Monitoring, backups, rollback, and runbooks
5. Secrets, rate limits, payments, and near-term constraints

Use mostly controlled choices. Allow at most one optional, 500-character symptom field. Do not accept files, repositories, URLs, code blocks, or logs in the public MVP.

### Output

- Readiness: `demo only`, `internal beta`, `limited production`, or `production candidate`
- Five fixed dimensions: security, reliability, maintainability, data/privacy, operability
- Up to five hard blockers, each tied to a control and supplied answer
- Important unknowns and how to verify them
- Existing strengths
- A prioritized 48-hour plan
- A prioritized two-week plan
- “Do not optimize yet” guidance
- One mapped next step with a stable ID: `self_serve`, `architecture_diagnostic`, or `engineering_rescue_inquiry`

Deliver the complete result before asking for contact information.

### Immediate visual behavior

The homepage should show a compact live preview with three one-click example profiles:

- AI-generated SaaS: Next.js, managed database, Stripe, OpenRouter
- Agent workflow: tools, retrieval, memory, human approval
- Payments product: KYC, wallet, on/off-ramp, webhooks

When the user starts, display honest application stages such as `validating answers`, `checking production gates`, `tailoring the plan`, and `validating the report`. Do not present hidden chain-of-thought or fake model reasoning. Reveal the final report only after schema and business-rule validation, then animate the fixed scorecard and plan components.

### Implementation boundary

Recommended flow:

```text
Browser wizard
  → validated enum-based manifest
  → server-side rate limit and sensitive-input checks
  → deterministic readiness policy
  → OpenRouter synthesis with the immutable policy result
  → strict JSON Schema validation
  → business-rule/evidence validation
  → fixed React report components
  → optional, explicit lead handoff
```

The OpenRouter key must stay server-side.

Use:

- a pinned primary model and pinned cross-provider fallback, selected from models that support structured output;
- `response_format.type = "json_schema"`, strict mode, required fields, size limits, and no additional properties;
- `provider.require_parameters = true`;
- `provider.data_collection = "deny"`;
- `provider.zdr = true`;
- a dedicated API key with a daily limit, model allowlist, output cap, timeout, and at most one retry;
- application-side rate limiting and a challenge only for repeat or suspicious traffic.

Do not use `openrouter/auto` for a scored production assessment. Pin versions, test upgrades against a small golden evaluation set, and change models deliberately.

OpenRouter references:

- [Structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs)
- [Provider routing and required parameters](https://openrouter.ai/docs/guides/routing/provider-selection)
- [Zero Data Retention routing](https://openrouter.ai/docs/guides/features/zdr)
- [Data collection](https://openrouter.ai/docs/guides/privacy/data-collection)
- [Prompt-injection guardrail](https://openrouter.ai/docs/guides/features/guardrails/prompt-injection)
- [Sensitive-information guardrail](https://openrouter.ai/docs/guides/features/guardrails/sensitive-info)
- [Usage accounting](https://openrouter.ai/docs/cookbook/administration/usage-accounting)
- [API-key spend limits](https://openrouter.ai/docs/api/api-reference/api-keys/create-a-new-api-key)

OpenRouter's ZDR option controls routing to providers it marks as zero-retention; it does not mean the content stays on Saberistic infrastructure. Requests still transit OpenRouter and a selected provider. Keep OpenRouter input/output logging and data-use opt-ins disabled, do not enable external tools or web search for this assessment, and disclose the boundary accurately.

### Lead handoff

After the report:

> Want a principal engineer to review this assessment?

The user must explicitly choose what is shared. Name, email, company, and website are collected only at this point and never sent to the model. The consent screen may share the deterministic readiness level and selected blocker IDs/labels, but never raw answers, symptom text, or AI prose. The internal notification contains a request ID rather than technical content; an authorized person opens the private Payload record before outreach.

The free AI check should feed the paid human offer, not replace it:

```text
Free Production Readiness Check
  → useful self-serve report
  → $200 Architecture Diagnostic
  → Prototype to Production or Engineering Rescue engagement
```

Position the $200 Architecture Diagnostic as the principal-engineer review of the system and assessment. The AI result handles common gates; the paid review covers actual architecture, tradeoffs, and evidence.

### Analytics events

Send only approved low-cardinality metadata to self-hosted Umami; never send answers, prompts, reports, contact fields, company names, URL query/hash values, tokens, or user-generated route/title/referrer content.

- `readiness_started`: example/custom, entry page
- `readiness_section_completed`: section number only
- `readiness_completed`: readiness level, latency bucket, policy version
- `readiness_blocked`: generic guardrail category
- `readiness_failed`: error class, fallback used
- `readiness_report_downloaded`: readiness level
- `readiness_handoff_started`: readiness level
- `readiness_handoff_submitted`: readiness level
- `contact_started`: allowlisted direct-service interest
- `contact_submitted`: allowlisted direct-service interest
- `contact_failed`: allowlisted direct-service interest and generic error class only

Core funnel:

```text
Hero impression
  → readiness started
  → readiness completed
  → optional report downloaded
  → human review requested
  → qualified conversation
```

## Payload CMS structure

This early content-model list is refined by the accepted implementation in [04 — Payload CMS implementation](./04-payload-cms-implementation.md). In particular, Payload may store editorial readiness copy, but scoring controls, policy logic, model schemas, and prompts are authoritative in Git rather than editable CMS records.

Recommended collections:

- `pages`
- `services`
- `prototypes`
- `case-studies`
- `experience`
- `evidence-sources`
- `technologies`
- `media`
- `diagnostic-requests`
- `contact-requests`

Recommended `case-studies` fields:

- title, slug, summary, problem, constraints, contribution, outcome, technologies
- organization name and external URL
- `relationship`
- role and date range
- `evidenceSources[]` relationship
- structured `claims[]`, each with an exact statement, type, evidence links, canonical claim state, permission evidence/reviewer/date, and allowed surfaces
- derived page-level `claimStatus` and `permissionStatus`
- featured order and publish status

Recommended `evidence-sources` fields:

- `title`, URL or private attachment reference, and `sourceType`
- `publisherOrOwner`, `accessedAt`, and short factual `supports` statement
- `strength`: `primary`, `first-party-public`, `public-contribution`, `secondary`, or `self-attested`
- for GitHub account/profile sources: `accountType`, `accountOwner`, and `selfAuthoredFields`; store profile bios, organization/company fields, pinned selections, and profile README claims with `strength: self-attested`
- for GitHub repository sources: `repositoryProvenance` (`organization_owned`, `personal_original`, `fork`, or `external_contribution`), `isFork`, optional `upstreamURL`, `license`, `lastVerifiedAt`, and an exact `authorshipScope`
- for external contributions: the commit or pull-request URL, author identity used for verification, repository owner, and a one-sentence description limited to the linked change
- `permissionStatus`: `public`, `approval-required`, or `private-only`
- `allowedSurfaces`: homepage, Work, About, proposal, or private-only
- optional archived URL/date and internal verification notes

Material role, contribution, outcome, and metric statements must render from these structured claims (or a typed claim-reference block), not arbitrary rich text. A publish hook blocks any selected `hold` or permission-restricted claim.

The public app should read only published case-study data. The readiness feature may receive a small, versioned list of approved case-study IDs so its recommendation can link to relevant proof without inventing credentials.

## V2 scope cut

Ship these first:

1. Homepage with the sharper prototype-to-production position
2. Prototype hub with three complete records, at least two functioning public prototypes, and one polished featured `beta` or `live` experience
3. Production Readiness Check
4. Three flagship services: Prototype to Production, Engineering Rescue, Fractional Principal Engineer
5. Four evidence-labeled case studies or experience profiles: Brave, BAXUS, Eternis, Spiral Safe
6. Founder About page and verified experience timeline
7. Payload CMS and self-hosted Umami
8. One contact flow mapped to build, fix, or senior help

The initial interactive launch shortlist is the organization-owned BackThen, FrescoPay, and TadaDing review described in [02](./02-information-architecture-and-prototype-hub.md), with payment-disabled Story Sprout Pay as a fallback. The personal-original pool—`solana-secrets-engine`, `temporal-web-api`, and `superpull-bonding-curve`—is a secondary source of open-source proof or build-note entries. Candidate status is not a shipping decision; the required runnable, maintenance, security, license, and claim review still applies, and `superpull-bonding-curve` must retain its experimental/not-audited warning.

Defer separate pages for every service, a broad AI-agent catalog, a generic chat assistant, a public code-upload audit, and low-evidence case studies. The smaller first release will feel more credible and make the AI feature easier to evaluate.

## Source inventory

- [AmirSaber's public GitHub profile](https://github.com/saberistic) — founder-controlled/self-authored account source; profile fields, pinned selections, and profile README are not independent corroboration
- [Saberistic team GitHub organization](https://github.com/saberistic-team) — organization-controlled account source; company/profile fields, pinned selections, and profile README content are founder-provided/self-authored rather than independent corroboration
- [`solana-secrets-engine`](https://github.com/saberistic/solana-secrets-engine) — `personal_original`, non-fork; Vault plugin for Solana accounts/signing
- [`temporal-web-api`](https://github.com/saberistic/temporal-web-api) — `personal_original`, non-fork; Apache-2.0
- [`superpull-bonding-curve`](https://github.com/saberistic/superpull-bonding-curve) — `personal_original`, non-fork; Apache-2.0; README warns that it is experimental and not audited
- [Brave Ads and browser privacy](https://brave.com/privacy/browser/)
- [Brave `ads-ui`](https://github.com/brave/ads-ui)
- [Brave `bat-go`](https://github.com/brave-intl/bat-go)
- [BAXUS marketplace](https://www.baxus.co/about)
- [BAXUS terms](https://baxus.co/termsconditions)
- [AmirSaber's public LinkedIn profile and BAXUS recommendation](https://www.linkedin.com/in/saberistic)
- [Fin](https://www.fin.com/)
- [EternisAI Enclaver](https://github.com/EternisAI/enclaver/blob/eternis/docs/architecture.md)
- [Spiral Safe](https://github.com/Spiral-Safe)
- [Archived Designity team page](https://web.archive.org/web/20240319063835/https://www.designity.com/team)
- [Designity public services repository](https://github.com/designitycom/web-services)
- [Superteam Open Source](https://oss.superteam.fun/)
- [Vyrent company page](https://www.linkedin.com/company/vyrent)
- [Designity's Vyrent case study](https://www.designity.com/case-studies/an-innovative-company-with-a-common-frustration)
- [Verdocs](https://verdocs.com/)
- [YODA Lab people and projects](https://yeoh-lab.wustl.edu/people/)
- [DeepDepth public repository](https://github.com/saberistic/DeepDepth)
