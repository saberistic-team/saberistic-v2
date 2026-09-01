# Three converging AI product workstreams

## Purpose and status

This build note records three product ideas that converged into one guarded conversion system:

1. a Production Readiness Check that produces useful results before asking for contact details;
2. a paid Architecture Diagnostic handoff for visitors who want human help; and
3. Gift Draft, a playful OpenRouter and Stripe experiment with a separate payment and fulfillment
   boundary.

The implementation work described here was assembled on August 31, 2026. This record deliberately
separates three states:

- **Built** means the code, routes, schemas, migrations, and tests exist in the repository release
  candidate.
- **Deployed** means an exact Git commit has passed hosted checks and is serving on Render.
- **Activated** means the external providers, secrets, webhooks, budgets, privacy controls, and
  feature flags have all been configured and the live path has passed acceptance.

Built does not imply deployed, and deployed does not imply activated. The readiness explanation is
now activated behind its deterministic authority and fail-closed controls: the complete readiness
report still works without a model. Architecture Diagnostic, Gift Draft AI, and both payment paths
remain off until their independent gates pass.

## Source authority

| Source                                                                                       | Original request                                                                                                                                                                                                              | How it is used here                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Build AI diagnostic lead funnel](https://chatgpt.com/s/cx_6a95ee3962c481918c291ccbc034c461) | Turn the architecture-diagnostic action into a lead generator with a questionnaire, email delivery, OpenRouter, fixed $200 Stripe Checkout, calendar routing, and Resend messages to the customer and `inbox@saberistic.com`. | Product intent and required fulfillment path. The repository is authoritative for the implemented safety and data boundaries.                                                                                  |
| [Add AI gifting game](https://chatgpt.com/s/cx_6a95ee59a0e0819199e5c4a585527b99)             | Build a game-like stream of varied online gift ideas for AmirSaber using OpenRouter and Stripe.                                                                                                                               | Product intent. The repository is authoritative for the three-round draft, signed quote, contribution, webhook, and manual-purchase contract.                                                                  |
| Current Production Readiness Check task                                                      | Complete and deploy the readiness function using the locally supplied OpenRouter key.                                                                                                                                         | Implementation, account-control verification, activation, and hosted acceptance. The repository and the evidence table below record the exact bounded route rather than treating possession of a key as proof. |
| [OpenRouter readiness implementation](./06-openrouter-readiness-check-implementation.md)     | Versioned readiness policy, model boundary, privacy controls, rate limiting, and activation conditions.                                                                                                                       | Detailed technical and operational source of truth for the readiness feature.                                                                                                                                  |
| [Operations and security runbook](./09-operations-security-and-runbook.md)                   | Key rotation, deployment, migration, retention, provider, and incident procedures.                                                                                                                                            | Shared operational boundary for all three workstreams.                                                                                                                                                         |

The shared conversations explain intent. They are not evidence that code was deployed, a provider
account was configured, a payment completed, or a customer message was delivered.

## Convergence summary

| Workstream                 | Built in the release candidate                                                                                                                                                                                                                                  | Deployed                                                                                                                                                                                                                                                                                                  | Activated                                                                                                                                                                                                                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production Readiness Check | Yes: controlled assessment, deterministic report, bounded optional OpenRouter adapter, handoff token, static UI, backend route, and Key Value-backed limiter are present.                                                                                       | Yes: release `edc97f1` passed CI and CodeQL, deployed to both Render services, applied its migrations, and the activation deploy `dep-daavtv942hec739fis8g` is live.                                                                                                                                      | Yes: the versioned account attestation and `AI_ENHANCEMENT_ENABLED=1` are deployed; the live contract smoke and hosted assessment both passed through the allowlisted Azure fallback route. The deterministic report remains authoritative and available on any AI failure. |
| Architecture Diagnostic    | Yes: report-bound questionnaire, minimized private record, customer and owner email paths, fixed-price Checkout, verified webhook, and scheduling redirect are present.                                                                                         | Yes: the routes and private schema are deployed, the three new migrations completed, and anonymous collection reads return `403`.                                                                                                                                                                         | No. `DIAGNOSTIC_ENABLED=0` remains the safe setting until Stripe, Resend, booking, webhook, retention, and live test-mode fulfillment gates pass.                                                                                                                           |
| Gift Draft                 | Yes: three-round game, citation-first OpenRouter discovery, independent retailer-page verification, strict ID-only selection, signed quote, fixed contribution Checkout, payment status, webhook/refund processing, and private fulfillment record are present. | Partly. Commit `69037dfa4f82f05642d8cfd61818cb6d4db0e059` passed hosted checks and deployed, but its supervised canary failed five of nine retailer-page reviews and was rolled back. The hardened citation-first verifier has local live evidence but does not yet have accepted hosted-canary evidence. | No. `GIFTING_AI_ENABLED=0` and `GIFTING_CHECKOUT_ENABLED=0` remain intentional. Gift AI still needs exact-artifact hosted checks, a supervised nine-page canary, deployed Redis limiting, and a rollback drill; Checkout separately needs Stripe fulfillment acceptance.    |

## Shared architecture

The three experiences reuse infrastructure without sharing authority:

```text
Render Static Site UI
  ├─ readiness answers ──> Payload/Next API ──> deterministic policy report
  │                                      └────> optional bounded OpenRouter rewrite
  │
  ├─ explicit diagnostic consent ───────> signed report handoff
  │                                      ├────> minimized private Payload record
  │                                      ├────> Resend report + minimal owner notice
  │                                      └────> fixed $200 Stripe Checkout + verified webhook
  │
  └─ Gift Draft choices ────────────────> OpenRouter citation discovery
                                         └─> direct retailer listing verification
                                             └─> canonical candidate ledger
                                                 └─> strict ID-only selector + cited ideas
                                         └────> signed contribution quote
                                               └─> Stripe Checkout + verified fulfillment record

Shared Render Key Value
  └─ expiring, HMAC-derived rate, token, daily, checkout, and concurrency counters
```

The shared OpenRouter key does not make the products one trust domain. Readiness forbids tools and
allows the model to rewrite only bounded explanation fields. Gift Draft intentionally requires a
web-search tool, but treats citation URLs only as discovery leads: the server independently verifies
the retailer page, availability, product identity, price, budget, and policy before any candidate
can reach the selector. Diagnostic fulfillment does not call OpenRouter at all; it authenticates the
already completed report.

## Workstream 1: Production Readiness Check

### What is built

- Twenty controlled questions across stage/architecture, identity/data, delivery, operations, and
  risk boundaries.
- Exact request validation, bounded optional symptom text, and local rejection of likely secrets,
  credentials, personal contact data, logs, code, and oversized input.
- A versioned deterministic scorer with explicit controls, completeness, dimension scores, hard
  blockers, readiness caps, strengths, unknowns, a 48-hour plan, and a two-week plan.
- A complete deterministic report before any model call, so timeout, budget exhaustion, invalid
  output, or unavailable infrastructure does not remove the product's core value.
- An optional OpenRouter adapter using strict structured output, two pinned-model slots, bounded
  tokens and timeout, request-level ZDR/provider controls, disabled plugins, router-metadata
  inspection, and local post-response invariant checks.
- Render Key Value-backed IP, anonymous-token, daily, rejection, and concurrency limits.
- An opaque report ID and short-lived signed handoff that binds the exact canonical report without
  storing its prose in the token or database.
- A static-site experience that keeps answers and the full report in browser memory and supports
  JSON download and print/PDF.

### Decisions that matter

The deterministic engine owns the score, readiness level, blocker IDs, severities, next-step ID,
and allowed action set. OpenRouter may improve concise explanation and ordering only. A successful
model response that violates the schema or deterministic invariants is discarded.

The locally supplied `OPENROUTER_API_KEY` is protected by an active key-specific Guardrail. Its
enforced budget is **$5 per month**. The owner expected a $10 ceiling, but the authoritative key
detail showed $5; the active, stricter $5 limit is the cost boundary used for this activation.
The Guardrail enforces ZDR, uses `Flag` for prompt-injection findings, applies all eight available
sensitive-information presets, and uses **Only Allow** lists for the Azure and Google Vertex
providers and for `google/gemini-2.5-flash-lite`, `openai/gpt-4.1-mini`, and `openai/gpt-4.1`.
Paid-model training, prompt storage, and broadcast are off, and the available Response Healing and
Pareto Router defaults are off. The global free-endpoint training toggle remains on, but the
key-specific model allowlist contains no free or suffixed model. The application adds its own
request-level ZDR, provider data-collection denial, required-parameter routing, explicit plugin
disables, local sensitive-text rejection, strict output schema, and router-metadata audit.

Render carries the exact `2026-09-01.1` account attestation and the reviewed
`AI_ENHANCEMENT_ENABLED=1` flag. A minimized live contract smoke passed through Azure fallback at
$0.0010176, and a hosted readiness assessment passed through Azure fallback at $0.0012168 and
displayed the AI-tailored source. The associated telemetry contained bounded outcome, routing, and
cost metadata only; it contained no prompt or input content.

### Endpoint and data boundary

- `POST /api/readiness/assess` accepts the normalized assessment and returns the deterministic or
  enhanced report, a fallback indicator, report ID, and optional signed handoff.
- No readiness answer set or full report is persisted to Payload or Umami.
- Safe operational logs contain bounded outcome metadata, not the request body, answers, symptom,
  prompt, model output, or handoff token.

## Workstream 2: Architecture Diagnostic

### What is built

- The complete readiness report appears before the diagnostic action or any contact field.
- Opening the diagnostic step requires an explicit user choice. The follow-up collects bounded
  contact, timeframe, time-band, timezone, optional company/context, contact consent, and a choice
  about whether to share the minimized assessment summary.
- The server verifies the report-bound handoff signature, expiry, policy version, report digest,
  readiness level, and selected blocker subset before it trusts the diagnostic request.
- Only the minimized lead and canonical blocker label snapshot are stored in the private
  `diagnostic-requests` collection. The full report is emailed to the customer and is not stored in
  Payload.
- Resend sends the authenticated report to the customer. The owner notice to
  `inbox@saberistic.com` contains only the request type and opaque request ID rather than the
  customer's contact details or report.
- Stripe Checkout fixes the architecture diagnostic price at $200 USD on the server. The browser
  cannot supply the amount, product, metadata, or success destination.
- The signed Stripe webhook validates event type, request ID, session, payment intent, amount, and
  currency before marking a private record paid and sending the scheduling confirmation.
- A provisional 90-day retention-review date is attached to the private lead.

### Endpoint and data boundary

- `POST /api/diagnostics/requests` validates consent and the signed readiness handoff, creates or
  safely reuses the private request, sends the two initial messages, and creates Checkout.
- `POST /api/stripe/diagnostic-webhook` verifies Stripe's raw-body signature and performs
  idempotent paid fulfillment.
- Payload's authenticated `/api/diagnostic-requests` collection surface remains staff-only; the
  public write route is deliberately separate.
- The scheduling provider owns live availability and calendar invitations. The application stores
  status and routes the paid visitor; it does not pretend to own calendar state.

### Activation boundary

Keep `DIAGNOSTIC_ENABLED=0` until all of the following are true:

- Render Key Value and the independent diagnostic rate-limit secret work in the deployed service;
- the restricted Stripe key is test-mode and limited to the required Checkout/webhook operations;
- the diagnostic webhook secret belongs to the exact deployed endpoint;
- the Resend key is sending-only and the configured From address is verified;
- the HTTPS booking URL is controlled, current, and tested after a paid test session;
- the private collection migration is applied and staff-only access is verified; and
- the 90-day review and deletion process has an accountable operator.

## Workstream 3: Gift Draft

### What is built

- A three-round interaction: OpenRouter returns nine ideas, the visitor sees three at a time, keeps
  one per round, and selects a finalist.
- Each draw has a fresh bounded variation seed and requests currently buyable physical items from
  current US listings.
- One 60-second pipeline first asks the primary pinned model to make at most two sequential
  `openrouter:web_search` calls. The model returns only `{"status":"researched"}`; the application
  ignores model-authored product fields and uses safe, unique citation annotations as discovery
  leads. A citation is not a product fact and does not enter the candidate ledger until its retailer
  page passes independent verification.
- The verifier currently supports four reviewed retailer families: Adafruit, iFixit, MoMA Design
  Store, and Uncommon Goods. It permits HTTPS on port 443 only, rejects credentials and non-public
  IPv4/IPv6 destinations, pins the verified DNS address into the TLS request while retaining native
  hostname verification, follows at most two redirects within the same retailer family, accepts
  HTML only, and enforces bounded DNS, request, aggregate, concurrency, and one-megabyte response
  limits. The under-$30 discovery lane omits Adafruit to avoid cheap components; arbitrary
  subdomains, marketplaces, affiliate redirects, and cited-but-unsupported hosts remain rejected.
- The page must contain exactly one unambiguous schema.org Product whose single Offer URL identifies
  the requested product path. The Offer must be USD and InStock, and any Product URL must identify
  that same page. Foreign or ambiguous structured-data terms, multiple matching products or offers,
  non-absolute Offer URLs, malformed prices, cross-product URLs, and pages outside the chosen budget
  fail closed. The verified page's Product name and Offer price become the canonical facts; the model
  cannot supply, clamp, normalize, or override them.
- If the primary citations produce fewer than nine verified, distinct products, the fallback pinned
  model gets exactly one bounded research attempt with the first call's URLs excluded. Both sets of
  pages are verified and deduplicated by canonical name and source URL under the original deadline.
  A provider/model failure may also consume the one fallback slot; the pipeline never expands into
  an unbounded third research attempt.
- Only after at least nine pages verify does a separate no-tools request use strict structured output
  with `provider.require_parameters=true`. It may return only nine distinct enum candidate IDs. The
  application reconstructs every final field from the verified ledger and revalidates the complete
  deck, so the selector cannot change a name, retailer, URL, category, or price.
- Research explicitly selects managed Exa, disables parallel tool calls, requests at most two
  searches with at most 20 results each and 40 total, caps per-result text at 1,500 characters, and
  supplies documented `max_uses`, step-count, and $0.08 per-research-call stop conditions. Because
  the server tool is beta and was observed once executing a pending third call, local validation
  rejects a response reporting more than three searches. Every other plugin is disabled;
  inference-provider ZDR and provider data-collection denial remain required. Result volume, request
  rate/daily limits, the per-call stop, and the account Guardrail spend cap are layered boundaries.
- OpenRouter documents ZDR as an inference-provider routing control; it does not cover enabled
  server tools such as Exa search. The privacy disclosure therefore names OpenRouter, the eligible
  inference provider, the selected search provider, and retailer pages rather than calling the
  entire search path zero-retention.
- Prohibited product types are excluded in the research instruction and deterministically rejected
  against the retailer-derived Product name and decoded product URL after Unicode normalization and
  format-control stripping. The code-owned policy covers the recipient's
  alcohol/tobacco/gambling/weapon/age-restricted, medical/supplement, size-dependent clothing,
  personal-care, gift-card/subscription/cash-equivalent, financial-asset, cannabis, and adult-product
  exclusions, including high-confidence aliases such as multi-tools, beanies, and hand cream.
  Manual review of all nine final pages remains an activation gate for opaque product identity,
  displayed price, current availability, and false-negative policy checks.
- Prices are recent observations before tax and shipping. They are not a retailer promise.
- A signed quote binds the selected item, exact observed amount, currency, retailer, source URL,
  offer ID, run ID, and expiry. Checkout accepts only that server-verifiable token.
- Stripe creates a fixed contribution to Saberistic. It does not place an order with the reference
  retailer. AmirSaber manually chooses and purchases the gift and may use the contribution for the
  selected item, tax, shipping, or a similar substitute if the listing changes.
- The webhook verifies signed Gift Draft metadata, Checkout/payment identity, amount, currency,
  refunds, and event idempotency before writing the private `gift-payments` fulfillment record.
- A payment-status endpoint reconciles the bearer Checkout session with Stripe and the private
  record without treating the browser's success query as proof of payment.

### Observed Gift AI evidence

The first hardened-adapter release, commit
`69037dfa4f82f05642d8cfd61818cb6d4db0e059`, passed GitHub CI and CodeQL and reached the exact Render
web deploy `dep-dabjign7e77c73ac0dgg` and Static Site deploy `dep-dabjigh5efls73anqovg`. During the
temporary AI canary `dep-dabjjpbm8hqs73e31oog`, the endpoint returned nine cards, but manual review
rejected **five of nine** retailer pages: PyRuler was out of stock; the MoMA card showed $25 while
the page showed $21; the Adafruit coaster showed $12.95 while the page showed $2.50; the Uncommon
Goods card showed $30 while the page showed $120; and the iFixit card showed $19.95 while the page
showed $36.95. A nine-card response was therefore not accepted as a valid draw.

Render rollback deploy `dep-dabjlh3m8hqs73e37qu0` returned the service to the safe state. The live
status response then reported both Gift flags false, and `POST /api/gifts/ideas` returned the
expected disabled `503`. Checkout was never enabled during this canary.

That failure led to the citation-first, source-page-authoritative verifier described above. A first
recovery run used GPT-4.1 research, one bounded GPT-4.1-mini supplemental research call, and GPT-4.1
selection. Across 67 unique citations and 77 retailer-page checks, 14 candidates passed
verification and the selector returned nine in 41.82 seconds for $0.0956208. The reverse model
order then passed with 13 verified candidates from 67 checks in 35.79 seconds for $0.0689972.

The final production-order under-$30 run required only GPT-4.1: 13 of 36 checked listings verified,
nine were selected in 25.77 seconds, and the recorded cost was $0.054866. A supervised browser
review confirmed all nine displayed prices and purchase availability. A mixed-price run then
verified ten of 25 listings and selected a valid low/middle/high deck in 17.56 seconds for
$0.054312. An earlier mixed attempt found 18 verified products but no high-price candidate; it
failed closed, prompted the supplemental search to target the missing band, and gained explicit
price-band telemetry and regression coverage.

This is correction evidence, not public activation evidence. The verifier release candidate still
needs its exact commit to pass the complete local and hosted checks, deploy with both flags off, and
pass a supervised hosted canary before `GIFTING_AI_ENABLED` can remain on.

### Endpoint and data boundary

- `POST /api/gifts/ideas` performs the rate-limited search and returns cited ideas with signed
  quote tokens.
- `GET /api/gifts/ideas` returns only the independently resolved AI/Checkout availability booleans
  so the static client can render an honest paused state; it is origin-checked and never cached.
- `POST /api/gifts/checkout` verifies the selected quote and creates hosted Checkout.
- `POST /api/gifts/webhook` verifies and persists supported Checkout, async payment, expiry, and
  refund events.
- `GET /api/gifts/payment-status` returns the reconciled status for one validated Checkout session.
- The `gift-payments` collection is private. Provider-controlled amount, payer, event, and payment
  fields are immutable through ordinary staff updates; fulfillment state and internal notes remain
  staff-managed.

### Activation boundary

OpenRouter search and Stripe Checkout are independent releases:

- `GIFTING_AI_ENABLED=1` requires Redis, a separate rate-limit secret, a quote-signing secret, the
  shared OpenRouter key, two pinned gift-search-capable model IDs, the account spend cap, and the
  intended inference ZDR/provider policy. The hardened exact commit must pass the complete automated
  suite, both pinned-model-order live smokes, GitHub CI and CodeQL, a flags-off Render deployment, a
  supervised hosted draw whose nine source pages all pass review, the same-token and concurrency
  limiter checks, bounded privacy-safe telemetry review, and an enable-to-disable rollback drill.
- `GIFTING_CHECKOUT_ENABLED=1` additionally requires a least-privilege Stripe test key, the exact
  webhook secret, deployed payment schema, test payment/refund/status evidence, and a documented
  manual purchase, substitution, support, and refund process.

Neither flag should be enabled merely because the page is deployed.

## Cross-workstream decisions

1. **Value before capture.** Readiness returns the complete self-serve result before diagnostic
   lead collection. Gift Draft provides an actual game and current evidence before Checkout.
2. **Deterministic authority.** Models never own a readiness score, a payment amount, a report
   identity, or a fulfillment state.
3. **Explicit product boundaries.** Readiness explanation, diagnostic purchase, Gift Draft search,
   and Gift Draft Checkout have separate flags and can be disabled independently.
4. **Server-only secrets.** Browser bundles never receive OpenRouter, Stripe, Resend, Redis, quote,
   rate-limit, handoff, or webhook secrets.
5. **Fail-closed external actions.** Missing Redis or provider configuration disables the external
   path. Readiness still falls back to its deterministic result; payment paths return unavailable
   without taking payment.
6. **Authenticated handoffs.** The diagnostic report and Gift Draft amount are signed before they
   cross the browser. Stripe webhooks are the payment authority, not success URLs.
7. **Data minimization.** Full readiness reports are not stored. Owner email is ID/type-only.
   Private payment and lead collections retain only what fulfillment and support require and carry
   review dates.
8. **Operational gates over optimistic copy.** A compiled page or successful provider call is not
   described as a live, supported product until deployment and fulfillment evidence exists.

## Activation runbook

### 1. Ship the initial fail-closed release

1. Regenerate Payload types after the final collection definitions.
2. Review and apply the committed `diagnostic-requests` and `gift-payments` migrations in order.
3. Run the full release checks in the evidence table below.
4. Validate `render.yaml` against Render's current Blueprint schema.
5. Commit and push the initial reviewed release candidate with all provider feature flags still
   `0`.
6. Wait for GitHub CI and CodeQL, then for the checks-gated Payload and Static Site deploys.
7. Confirm `/api/ready`, the readiness page, the Gift Draft page, privacy copy, migrations, and
   staff-only collection access before adding provider secrets.

### 2. Provision shared rate-limit infrastructure

1. Provision the Blueprint-managed Key Value instance in the same Render environment and region.
2. Confirm `REDIS_URL` uses the internal connection string and external access remains disabled.
3. Confirm the generated readiness, gifting, diagnostic, handoff, and quote secrets are distinct.
4. Exercise allowed, limited, concurrency, unavailable, and restart behavior. Free Key Value is
   volatile and therefore a staging control, not the hard OpenRouter cost ceiling.

### 3. Install the OpenRouter readiness configuration

This stage is complete for readiness. The account controls below were verified, the exact
`2026-09-01.1` attestation was installed in Render, the reviewed flag was enabled, and both the
contract smoke and hosted product acceptance passed. The numbered procedure remains the rotation
and re-activation runbook for any future key, Guardrail, provider, or model change.

1. Keep the local `.env` key ignored by Git and excluded from Docker context. Never copy it into
   `render.yaml` or a client-visible variable.
2. Add `OPENROUTER_API_KEY`, `OPENROUTER_PRIMARY_MODEL`, `OPENROUTER_FALLBACK_MODEL`, and
   `OPENROUTER_ACCOUNT_GATES_CONFIRMED` manually to the existing Render web service. Render ignores
   newly added `sync: false` variables during an existing Blueprint update.
3. Set a dedicated hard spend limit, verify account/workspace plugin defaults and “prevent
   overrides” behavior, disable prompt logging/data opt-ins, verify guardrails, and confirm both
   pinned models route only through acceptable ZDR endpoints with required structured-output
   parameters.
4. Record the exact readiness policy version in `OPENROUTER_ACCOUNT_GATES_CONFIRMED`. The current
   implementation requires `2026-09-01.1`.
5. Commit the Blueprint change to `AI_ENHANCEMENT_ENABLED=1`; do not rely on a Dashboard-only flag
   that the next Blueprint sync would reset.
6. Verify one complete assessment reports `fallbackUsed: false`, then verify timeout, invalid
   output, budget/rate limit, and Redis-unavailable cases still return the deterministic report.

### 4. Activate Architecture Diagnostic in test mode

Stripe foundation status on August 31, 2026: the separate Saberistic test account, Diagnostic
Checkout-Sessions-only restricted key, replacement event-scoped snapshot webhook, and
corresponding Render secrets are provisioned. The original Diagnostic webhook was disabled after
a credential-handling audit, its replacement signing secret was deployed, and signed probes prove
the replacement is accepted while the retired secret is rejected. Resend, verified-sender,
booking, payment, fulfillment, and retention acceptance remain open, so `DIAGNOSTIC_ENABLED=0`
is still intentional.

1. Add the restricted Stripe key, webhook secret, Resend key, verified sender, and HTTPS booking
   URL directly to the existing Render service.
2. Register the deployed `/api/stripe/diagnostic-webhook` URL in Stripe test mode.
3. Verify one complete flow: readiness report, explicit consent, minimized private record,
   customer report, ID/type-only owner notice, fixed $200 Checkout, verified paid webhook, customer
   booking message, and scheduling redirect.
4. Verify duplicate requests and webhook retries are idempotent; invalid signatures, amount,
   currency, report, handoff, and selected blocker combinations must fail closed.
5. Confirm staff access and the retention-review workflow, then set `DIAGNOSTIC_ENABLED=1` in a
   reviewed Blueprint change.

### 5. Activate Gift Draft in two stages

Stripe foundation status on August 31, 2026: the separate Gift Checkout-Sessions-only restricted
key, five-event snapshot webhook, and corresponding Render secrets are provisioned. The original
hosted Gift AI canary failed source-page review and was rolled back. The replacement verifier has
passed local real-provider runs in both model orders, an under-$30 supervised nine-page review, and
a mixed-price draw. Its exact-deploy, hosted Redis, and rollback gates remain open.
Payment/refund/fulfillment acceptance also remains open, so `GIFTING_AI_ENABLED=0` and
`GIFTING_CHECKOUT_ENABLED=0` are still intentional.

1. Configure pinned gift-search models and run the opt-in real OpenRouter search smoke in both model
   orders with the account spend/inference-ZDR controls already in place. This gate has passed,
   including a mixed-price draw.
2. Push the exact hardened commit, wait for CI and CodeQL, and deploy it to Render with both Gift
   flags still `0`.
3. Temporarily enable AI for a supervised canary, inspect all nine final retailer pages, exercise
   the same-token Redis success-to-`429` boundary and concurrency behavior, review bounded logs, and
   prove the flag can return to `0`. Leave AI enabled only if every check passes.
4. Configure a least-privilege Stripe test key and the exact `/api/gifts/webhook` signing secret.
5. Complete test-mode payment, asynchronous payment, expiry, duplicate webhook, partial refund,
   full refund, payment-status, and staff fulfillment checks.
6. Confirm the public contribution/manual-purchase disclosure and internal support procedure, then
   enable `GIFTING_CHECKOUT_ENABLED=1` in a reviewed Blueprint change.

### 6. Observe and retain evidence

Record the exact commit, hosted checks, Render deploys, Blueprint sync, migrations, live endpoint
responses, provider test objects, and rollback result. Do not record API keys, webhook secrets,
handoff tokens, raw prompts, model output, contact data, or complete provider payloads.

## Verification and deployment evidence

This table records the combined release candidate and its hosted acceptance. Provider fulfillment
rows remain pending by design; a deployed, fail-closed product is not the same as an activated
provider workflow.

| Gate                           | Required evidence                                                                                               | Current record                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Root typecheck                 | Command result for `pnpm typecheck`                                                                             | Passed in the final local release checks on September 1, 2026.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Static-site typecheck          | Command result for `pnpm typecheck:site`                                                                        | Passed in the same final local run.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Lint                           | Command result for `pnpm lint`                                                                                  | Passed in the same final local run.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Unit/integration suite         | Passing/skipped totals for `pnpm test:int`                                                                      | 660 passed and 4 opt-in live tests skipped across 47 files in the hardened Gift release candidate.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Payload production build       | Successful `pnpm build`                                                                                         | Passed; Next generated the readiness, diagnostic, Gift Draft, payment-status, and webhook route inventory.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Fixture static export          | Page count and export-verifier result from `pnpm build:site:fixture`                                            | Passed; 29 pages, 13 Build Notes, two prototype routes, and the required SEO/media assets were verified.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Browser acceptance             | Focused readiness, diagnostic handoff, Gift Draft, privacy, and public-smoke results                            | All 26 production scenarios passed against `https://saberistic.com`; 23 passed in the parallel run and three parallel page-load timeouts passed immediately on a one-worker retry. The opt-in live Umami delivery case remained skipped.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Payload migrations             | Status/order plus staging table and staff-access checks                                                         | All eight migrations applied in order against a disposable fresh Postgres database. Render startup then migrated `20260831_204405_architecture_diagnostic_funnel`, `20260831_205708_gift_payments`, and `20260831_210012_diagnostic_report_one_time_key` successfully; anonymous reads of both new private collections returned `403`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Blueprint validation           | Authenticated Render validation against the final file                                                          | Passed through authenticated Blueprint sync `dep-daavhje7bikc73cg91e0`, which finished live on the exact release commit at 22:02:26Z.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| OpenRouter readiness adapter   | One real minimized request using the local key                                                                  | The activation contract smoke passed through Azure using fallback routing at a total cost of $0.0010176.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Hosted readiness AI acceptance | One complete real-domain assessment with a validated enhancement                                                | Passed through Azure using fallback routing at a total cost of $0.0012168, and the result displayed the AI-tailored source. Telemetry contained no prompt, answers, symptom, or other input content.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| OpenRouter Gift adapter        | Real citation discovery, independent listing verification, and strict nine-ID selection                         | The earlier model-field contract produced two apparently successful local smokes, but the hosted source-page review proved that evidence insufficient and superseded it. The citation-first replacement passed in both model orders. Its final under-$30 production-order run checked 36 listings, verified 13, selected nine, completed in 25.77 seconds, and cost $0.054866; all nine final pages then passed visible-price and purchase-availability review. The reverse-order run checked 67 listings, verified 13, completed in 35.79 seconds, and cost $0.0689972. A mixed-price run checked 25 listings, verified ten, selected all three required price bands, completed in 17.56 seconds, and cost $0.054312. It retained no raw prompt, model output, product URL, or secret.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| OpenRouter account gates       | Hard spend cap, plugin override review, logging/data-use settings, guardrail, pinned models, ZDR endpoints      | Passed for readiness. The active key-specific Guardrail enforces the stricter $5 monthly cap despite the owner's $10 expectation, ZDR, prompt-injection `Flag`, all eight sensitive-information presets, **Only Allow** providers Azure and Google Vertex, and **Only Allow** models `google/gemini-2.5-flash-lite`, `openai/gpt-4.1-mini`, and `openai/gpt-4.1`. Paid-model training, prompt storage, broadcast, Response Healing, and Pareto Router defaults are off. The global free-training toggle is on, but no free or suffixed model is allowlisted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Git release                    | Commit SHA, branch, and clean-tree confirmation                                                                 | `edc97f116e5f641b2757ef8d528f7b0ebfc42e15` was pushed to `main`; the working tree was clean after the push.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Hosted checks                  | GitHub CI and CodeQL run URLs/IDs                                                                               | GitHub [verify](https://github.com/saberistic-team/saberistic-v2/actions/runs/33443910331/job/99658402867), [CodeQL actions](https://github.com/saberistic-team/saberistic-v2/actions/runs/33443910325/job/99658407585), and [CodeQL JavaScript/TypeScript](https://github.com/saberistic-team/saberistic-v2/actions/runs/33443910325/job/99658407878) all completed successfully.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Render Payload deploy          | Deploy ID, commit, live timestamp, `/api/ready`, migration result, and error-log scan                           | Blueprint deploy `dep-daavhje7bikc73cg91e0` and secret-aware follow-on deploy `dep-daavhlo5cbfc738v3sg0` are live on `edc97f1`; the latter finished at 22:04:06Z. `/api/ready` returned `200` with `Cache-Control: no-store`, all three new migrations completed, and the release-window error-level log scan was empty. Readiness activation deploy `dep-daavtv942hec739fis8g` is also live with the exact account attestation and AI flag enabled.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Render Static Site deploy      | Deploy ID, commit, live timestamp, page count, and custom-domain smoke                                          | `dep-daavj1brjlhs7382bpig` is live on `edc97f1` as of 22:02:55Z. Render generated 30 static route outputs and verified 11 build notes, five prototype routes, and required media/SEO assets; `/readiness` and `/gifts` returned `200` on the custom domain.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Gift hosted adapter canary     | Exact commit/deploy, nine source-page reviews, disabled-state verification, and rollback                        | Commit `69037dfa4f82f05642d8cfd61818cb6d4db0e059` passed CI and CodeQL and reached web deploy `dep-dabjign7e77c73ac0dgg` and Static Site deploy `dep-dabjigh5efls73anqovg`. Temporary canary `dep-dabjjpbm8hqs73e31oog` returned nine cards, but five failed manual listing review: one was out of stock and four displayed materially different prices. The canary failed. Rollback `dep-dabjlh3m8hqs73e37qu0` restored `ideasEnabled:false`, `checkoutEnabled:false`, and the expected disabled `503`. The citation-first replacement has not yet passed an exact-artifact hosted canary.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Render Key Value               | Resource ID, internal-only network state, web-service wiring, limiter acceptance                                | `red-daavhj67bikc73cg910g` is available in Ohio on the free plan, persistence off, `noeviction`, and an empty external IP allowlist. Blueprint wiring is live and the production readiness assessment completed through the shared limiter.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Stripe test-mode foundation    | Separate account, least-privilege keys, event-scoped snapshot webhooks, Render secret names, and healthy deploy | Provisioned in the separate `Saberistic` test account (`acct_1UAeCbRSbTykmPAp`). Independent `saberistic-gift-render-test` and `saberistic-diagnostic-render-test` keys each grant **Checkout Sessions: Write** as their only non-`None` permission; an initial pre-install Gift key was expired immediately and replaced. Gift destination `we_1UAeOxRSbTykmPApg8H6rdML` sends `checkout.session.completed`, both async-payment outcomes, `checkout.session.expired`, and `charge.refunded` to `https://saberistic-web-staging.onrender.com/api/gifts/webhook`. Replacement Diagnostic destination `we_1UAenfRSbTykmPApigB7OOie` (`saberistic-diagnostic-render-test-v2`) sends `checkout.session.completed` and `checkout.session.async_payment_succeeded` to `https://saberistic-web-staging.onrender.com/api/stripe/diagnostic-webhook`; the original destination `we_1UAeRSRSbTykmPApCT18Wvhu` is disabled. Both active destinations use snapshot payloads and Stripe API `2026-08-26.dahlia`. `STRIPE_RESTRICTED_KEY`, `STRIPE_GIFT_WEBHOOK_SECRET`, `STRIPE_DIAGNOSTIC_RESTRICTED_KEY`, and `STRIPE_DIAGNOSTIC_WEBHOOK_SECRET` are installed directly on the Render web service without secret values entering the repository. A harmless signed probe returned `200` from each active route; the same Diagnostic probe signed with the retired secret returned `400`. Corrected rotation deploy `dep-dab183740ujc739hdm4g` became live at 23:55:39Z; `/api/health` and `/api/ready` returned `200`, with no release-window error or 5xx logs. No publishable key is needed because both integrations create Stripe-hosted Checkout Sessions server-side. `GIFTING_CHECKOUT_ENABLED=0` and `DIAGNOSTIC_ENABLED=0` remain intentional until their end-to-end acceptance suites pass. |
| Diagnostic fulfillment         | Stripe test session/event IDs, Resend IDs, private request ID, booking redirect, and negative tests             | Pending; do not include customer data.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Gift fulfillment               | Search smoke, Stripe test session/event IDs, status/refund checks, private payment ID, and negative tests       | Pending; do not include payer data.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Rollback/deactivation          | Evidence that all four provider flags can be returned to `0` without removing deterministic readiness           | Gift AI's failed canary was returned to `0` by `dep-dabjlh3m8hqs73e37qu0`; status and disabled-route checks passed afterward. Readiness AI remains enabled and accepted, while `GIFTING_AI_ENABLED=0`, `GIFTING_CHECKOUT_ENABLED=0`, and `DIAGNOSTIC_ENABLED=0` preserve the other provider boundaries. The hardened Gift release still needs its own enable-to-disable drill after its hosted canary; a live readiness enable-to-disable drill also remains pending.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

## Remaining gates

Readiness AI is activated, but the combined product must not be called fully activated until these
remaining external gates are closed:

1. keep the readiness key Guardrail, $5 monthly cap, provider/model allowlists, ZDR, privacy
   settings, plugins, and versioned attestation under review; any material change requires the
   contract smoke and hosted acceptance to pass again;
2. make Diagnostic Stripe, Resend, booking, webhook, and 90-day review behavior pass in test mode
   before `DIAGNOSTIC_ENABLED=1`;
3. deploy the exact citation-first Gift commit only after CI and CodeQL pass; then inspect all nine
   final retailer pages in a supervised hosted canary, prove the same anonymous token receives four
   allowed draws followed by `429`, exercise IP/daily/concurrency failure behavior, review bounded
   cost/privacy telemetry, and complete an enable-to-disable rollback drill before
   `GIFTING_AI_ENABLED=1` can remain set;
4. make Gift Draft Checkout pass a complete Stripe test-mode flow: Checkout creation, paid webhook,
   verified return status, async success and failure, expiry, duplicate delivery, partial and full
   refunds, and staff fulfillment tied only to paid state. Add or explicitly resolve reconciliation
   for `refund.failed` and `refund.updated`, test failed/expired quote reuse and hosted-database
   concurrency/idempotency, align the webhook destination and SDK API versions, document the manual
   purchase/substitution/support/refund and 90-day deletion processes, and establish cross-system
   trace correlation before `GIFTING_CHECKOUT_ENABLED=1`;
5. monitor provider errors without retaining prompts, reports, contact data, or provider secrets,
   and perform a live enable-then-disable rollback drill; and
6. replace the free Render database and Key Value resources with a backed-up, durable production
   plan before this staging proof is described as production infrastructure.

## Deactivation and rollback

The fastest safe response to provider, privacy, budget, payment, or fulfillment uncertainty is to
return the affected flag to `0`:

- `AI_ENHANCEMENT_ENABLED=0` preserves the complete deterministic readiness report;
- `GIFTING_AI_ENABLED=0` stops new model searches;
- `GIFTING_CHECKOUT_ENABLED=0` stops new Gift Draft Checkout creation; and
- `DIAGNOSTIC_ENABLED=0` stops new paid diagnostic requests.

Disabling a feature does not erase existing private payment or diagnostic records and does not
replace webhook reconciliation for already-created Stripe sessions. Revoke or rotate compromised
provider credentials, keep supported webhooks available long enough to reconcile outstanding test
or live sessions, and use a forward database fix unless a reviewed down migration and recovery plan
prove rollback safe.
