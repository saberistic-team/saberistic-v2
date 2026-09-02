# Three converging AI product workstreams

## Purpose and status

This build note records three product ideas that converged into one guarded conversion system:

1. a Production Readiness Check that produces useful results before asking for contact details;
2. a paid Architecture Diagnostic handoff for visitors who want human help; and
3. Gift Draft, a playful OpenRouter and Stripe experiment with a separate payment and fulfillment
   boundary.

The implementation work described here was assembled from August 31 through September 2, 2026. This
record deliberately separates three states:

- **Built** means the code, routes, schemas, migrations, and tests exist in the repository release
  candidate.
- **Deployed** means an exact Git commit has passed hosted checks and is serving on Render.
- **Activated** means the external providers, secrets, webhooks, budgets, privacy controls, and
  feature flags have all been configured and the live path has passed acceptance.

Built does not imply deployed, and deployed does not imply activated. The readiness explanation is
now activated behind its deterministic authority and fail-closed controls: the complete readiness
report still works without a model. Gift Draft's generated inventory and cached game are activated;
Architecture Diagnostic and both payment paths remain off until their independent gates pass.

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

| Workstream                 | Built in the release candidate                                                                                                                                                                                                                                                                                     | Deployed                                                                                                                                                                          | Activated                                                                                                                                                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production Readiness Check | Yes: controlled assessment, deterministic report, bounded optional OpenRouter adapter, handoff token, static UI, backend route, and Key Value-backed limiter are present.                                                                                                                                          | Yes: release `edc97f1` passed CI and CodeQL, deployed to both Render services, applied its migrations, and the activation deploy `dep-daavtv942hec739fis8g` is live.              | Yes: the versioned account attestation and `AI_ENHANCEMENT_ENABLED=1` are deployed; the live contract smoke and hosted assessment both passed through the allowlisted Azure fallback route. The deterministic report remains authoritative and available on any AI failure. |
| Architecture Diagnostic    | Yes: report-bound questionnaire, minimized private record, customer and owner email paths, fixed-price Checkout, verified webhook, and scheduling redirect are present.                                                                                                                                            | Yes: the routes and private schema are deployed, the three new migrations completed, and anonymous collection reads return `403`.                                                 | No. `DIAGNOSTIC_ENABLED=0` remains the safe setting until Stripe, Resend, booking, webhook, retention, and live test-mode fulfillment gates pass.                                                                                                                           |
| Gift Draft                 | Yes: quick three-round game, durable model-generated concept inventory, locally cached generated WebP images, asynchronous replenishment jobs, signed contribution, reservation lifecycle, payment status, webhook/refund processing, and private fulfillment record are present. | Yes: generated-inventory release `0691d29` and quota correction `44a1013` passed CI and CodeQL, deployed to both Render services, and applied the forward cutover migration. | AI game yes, Checkout no. `GIFTING_AI_ENABLED=1` now serves a ready four-lane cache and a live nine-card draft; `GIFTING_CHECKOUT_ENABLED=0` remains intentional until Stripe lifecycle acceptance passes. |

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
  └─ Gift Draft choices ────────────────> fast deal from durable product inventory
                                         ├─> nine cached AI gift concepts + signed quotes
                                         └─> best-effort minimum-stock job enqueue

Gift inventory worker
  ├─ strict OpenRouter concept + price ─> deterministic product checks
  └─ OpenRouter image generation ───────> bounded cached WebP artwork

Selected gift ─────────────────────────> atomic inventory reservation
                                         └─> Stripe contribution Checkout + verified webhook
                                             ├─> paid: retire item
                                             └─> failed/expired: release item

Shared Render Key Value
  └─ expiring, HMAC-derived rate, token, daily, checkout, and concurrency counters
```

The shared OpenRouter key does not make the products one trust domain. Readiness forbids tools and
allows the model to rewrite only bounded explanation fields. Gift Draft uses one strict structured
generation plus the dedicated OpenRouter Image API in its background inventory pipeline; a player
draw does not wait for either provider call. There is no retailer search, page fetch, media proxy, or
periodic retailer validation. The worker validates the model-authored concept, price band, and
product policy, converts the returned raster image to a bounded WebP, and stores the complete card
before it can be dealt. Diagnostic fulfillment does not call OpenRouter at all; it authenticates the
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
enforced budget is **$10 per month**, and the key separately has a **$10 weekly credit limit**.
The Guardrail enforces ZDR, uses `Flag` for prompt-injection findings, applies all eight available
sensitive-information presets, and uses **Only Allow** lists for the Azure and Google Vertex
providers and for `google/gemini-2.5-flash-lite`, `openai/gpt-4.1-mini`, `openai/gpt-4.1`, and
`google/gemini-3.1-flash-lite-image`.
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

- A three-round interaction: the server deals nine eligible inventory items, the visitor sees three
  at a time, keeps one per round, and selects a finalist. The player path is optimized for speed and
  does not wait for OpenRouter or remote product media.
- Durable PostgreSQL inventory stores plausible, explicitly disclosed AI-generated gift concepts.
  Each record includes a model-authored name, suggested contribution amount, description,
  suitability note, themes, lifecycle state, and generated artwork cached on Saberistic's server.
- The background worker requests one product image from OpenRouter's dedicated Image API, rejects
  unsupported or unsafe raster output, converts the result to a bounded WebP, and saves it before the
  concept can enter a deal. The game never hotlinks or fetches retailer media.
- Every draw performs a best-effort stock-floor check and queues background discovery when eligible
  inventory is below the configured minimum. The draw returns from existing inventory while that job
  runs, so replenishment latency is moved out of the player's interaction.
- Background replenishment uses one strict structured OpenRouter response for a concept and price,
  then applies deterministic schema, budget, product-policy, price-band, theme, and uniqueness checks.
  The server builds the visual prompt from those validated fields; arbitrary visitor text is never
  forwarded to the image model.
- There is no retailer revalidation path. The forward cutover migration fences queued or running
  retailer-validation jobs, marks unsold legacy retailer rows ineligible, and preserves sold rows,
  cached images, and payment history without deleting them.
- Inventory has explicit `available`, `reserved`, and `sold` states. A signed quote binds the durable
  inventory ID and immutable product/amount fields. Checkout atomically reserves the selected item;
  a paid contribution marks it sold, while a definitively failed or expired Checkout releases the
  same reservation. A sold or refunded item is not silently returned to inventory.
- Each deal still enforces the selected budget, exact public response shape, distinct inventory IDs
  and product names, and—for a mixed deck—low, middle, and high price coverage. The server does not
  clamp a price or invent a replacement inside a dealt record.
- Prohibited product types are excluded in the model instruction and deterministically rejected
  across the stored product fields after Unicode normalization and format-control stripping. The
  code-owned policy covers the recipient's
  alcohol/tobacco/gambling/weapon/age-restricted, medical/supplement, size-dependent clothing,
  personal-care, gift-card/subscription/cash-equivalent, financial-asset, cannabis, and adult-product
  exclusions, including high-confidence aliases such as multi-tools, beanies, and hand cream.
- The displayed price is a model-generated suggested gift amount, not an observed retail offer.
  Stripe creates a fixed gift contribution to Saberistic, not a product order. AmirSaber manually
  decides what to purchase and may use the contribution toward the concept, related costs, a
  substitute, or another gift.
- The webhook verifies signed Gift Draft metadata, Checkout/payment identity, amount, currency,
  inventory reservation, refunds, and event idempotency before writing the private `gift-payments`
  fulfillment record and applying the corresponding inventory transition.
- A payment-status endpoint reconciles the bearer Checkout session with Stripe and the private
  record without treating the browser's success query as proof of payment.

### Observed Gift AI evidence

The first pre-verifier adapter release, commit
`69037dfa4f82f05642d8cfd61818cb6d4db0e059`, passed GitHub CI and CodeQL and reached the exact Render
web deploy `dep-dabjign7e77c73ac0dgg` and Static Site deploy `dep-dabjigh5efls73anqovg`. During the
temporary AI canary `dep-dabjjpbm8hqs73e31oog`, the endpoint returned nine cards, but manual review
under the then-current acceptance standard rejected **five of nine** retailer pages: PyRuler was out
of stock; the MoMA card showed $25 while the page showed $21; the Adafruit coaster showed $12.95
while the page showed $2.50; the Uncommon Goods card showed $30 while the page showed $120; and the
iFixit card showed $19.95 while the page showed $36.95. A nine-card response was therefore not
accepted as a valid draw.

Render rollback deploy `dep-dabjlh3m8hqs73e37qu0` returned the service to the safe state. The live
status response then reported both Gift flags false, and `POST /api/gifts/ideas` returned the
expected disabled `503`. Checkout was never enabled during this canary.

That failure first led to a source-page-authoritative verifier. Its local evidence was
promising: one recovery run checked 77 retailer pages, verified 14 candidates, and selected nine in
41.82 seconds for $0.0956208; reverse model order verified 13 candidates in 35.79 seconds for
$0.0689972. Later local under-$30 and mixed runs also produced nine-card decks, and a supervised
browser review found the under-$30 pages consistent at that moment.

Those results are now explicitly **superseded verifier evidence**, not evidence for the current
contract. The mandatory retailer-fetch design failed two hosted canaries:

- under $30: 21 pages checked, four verified, including eight `load` rejections and six
  `budget_above` rejections; and
- mixed: 46 pages checked, six verified, including 26 `load` rejections.

The hosted results showed that requiring the application to scrape enough independent retailer
pages made a small game slow, fragile, and unable to return nine ideas reliably.

Live OpenRouter compatibility experiments on September 1, 2026 then closed the remaining citation
path. Combining the deprecated `web` plugin with strict structured output returned nine
schema-valid product records but no URL annotations. Combining the web-search server tool with the
strict response schema returned no compatible endpoint. The first result could not support an
annotation gate; the second could not run the desired contract at all. Citation metadata is
therefore advisory if it happens to appear and is not required for acceptance.

The product owner subsequently replaced that retailer-backed design with the generated-concept
inventory recorded here. OpenRouter authors a bounded product concept and suggested price, then the
Image API creates its product artwork; both happen off the player path and the complete card is
cached for later draws. There is no retailer fetching or availability claim. The contribution is a
gift amount inspired by the concept, not an order for the pictured object.

Gift AI is now active on the hosted staging service. Release `0691d29` replaced retailer discovery
with generated inventory, and `44a1013` separated the new generation quota from retired retailer-era
jobs. Both releases passed CI and CodeQL. Web deploy `dep-dabp6kpt0dsc73cte3vg` is live on `44a1013`,
the generated-inventory cutover migration completed in 7 ms, and all four price lanes reached the
nine-distinct-concept readiness floor. The public status returned `ideasEnabled: true` and
`inventoryStatus: ready`; its request-tail worker then returned `idle` with no unfinished baseline
job.

A real custom-domain game dealt nine cached concepts across three rounds without waiting for
OpenRouter, reached the three-finalist screen, and displayed the fixed-contribution/manual-purchase
boundary while Checkout remained paused. One selected 22,502-byte WebP returned `200` with a stable
ETag and then `304` on conditional revalidation. Release-window logs contained no retailer request.
The complete fill and live game brought the key's all-time total shown by OpenRouter Activity to
approximately $5.93, below both active $10 controls. Live limiter, provider-outage, depletion, and
enable-disable drills remain operational hardening items rather than blockers for the cached staging
game.

### Endpoint and data boundary

- `POST /api/gifts/ideas` deals nine eligible cached inventory records with signed quote tokens and
  makes a best-effort request to replenish inventory below the configured floor.
- `GET /api/gifts/ideas` returns only the independently resolved AI/Checkout availability booleans
  so the static client can render an honest paused state; it is origin-checked and never cached.
- `GET /api/gifts/artwork/:id` serves the locally stored generated WebP with a bounded cache policy;
  it does not call OpenRouter on each card render.
- Background inventory jobs generate and cache product concepts and images without exposing provider
  credentials, prompts, or base64 image data to the browser.
- `POST /api/gifts/checkout` verifies the selected quote, atomically reserves the matching available
  inventory item, and creates hosted Checkout.
- `POST /api/gifts/webhook` verifies and persists supported Checkout, async payment, expiry, and
  refund events, then retires or releases the exact reservation according to effective payment state.
- `GET /api/gifts/payment-status` returns the reconciled status for one validated Checkout session.
- The `gift-payments` collection is private. Provider-controlled amount, payer, event, and payment
  fields are immutable through ordinary staff updates; fulfillment state and internal notes remain
  staff-managed.

### Activation boundary

Gift inventory/discovery and Stripe Checkout are independent releases:

- `GIFTING_AI_ENABLED=1` requires Redis, a separate rate-limit secret, a quote-signing secret, the
  shared OpenRouter key, pinned Gift model configuration, account spend cap, intended provider/privacy
  policy, the durable inventory migration, and a working background job runner. The staged activation
  recorded here followed the complete automated suite, GitHub CI and CodeQL, a flags-off Render
  deployment, the legacy inventory cutover, minimum-stock generation with bounded cached WebP images,
  a fast hosted nine-item deal with no provider call on the player path, and bounded privacy-safe log
  and spend review. Live limiter/concurrency, outage, depletion, and rollback drills remain required
  before promoting the free staging proof to supported production infrastructure.
- `GIFTING_CHECKOUT_ENABLED=1` additionally requires a least-privilege Stripe test key, the exact
  webhook secret, deployed payment and inventory schema, tested reservation conflict/release/sale
  transitions, test payment/refund/status evidence, and a documented manual purchase, substitution,
  support, and refund process.

Neither flag should be enabled merely because the page is deployed.

## Cross-workstream decisions

1. **Value before capture.** Readiness returns the complete self-serve result before diagnostic
   lead collection. Gift Draft provides the game and cached generated-concept context before Checkout.
2. **Deterministic authority.** Models never own a readiness score, a payment amount, a report
   identity, or a fulfillment state.
3. **Explicit product boundaries.** Readiness explanation, diagnostic purchase, Gift Draft inventory
   discovery/dealing, and Gift Draft Checkout have separate flags and can be disabled independently.
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
hosted Gift AI canary failed its then-current source-page gate and was rolled back. A mandatory
retailer-fetch replacement passed local samples but failed hosted under-$30 and mixed draws, so that
request-time design is superseded. The September 1 provider experiment also showed that strict
output plus the deprecated web plugin omitted annotations, while strict output plus server-tool
search had no compatible endpoint. The approved replacement generates plausible unbranded gift
concepts, suggested contribution amounts, and product artwork through pinned OpenRouter text and
image models, then deals only from locally cached inventory. A bounded, process-local single-flight
drain runs those durable generation jobs after status and draw responses on the existing Render web
service; this avoids a new paid worker while keeping both OpenRouter calls out of the player response.
A standalone worker command remains for supervised prefill or a future dedicated service. The exact
deploy, migration, four-lane inventory fill, hosted game, image cache, bounded-log, and spend checks
now pass, so `GIFTING_AI_ENABLED=1` is intentional. Payment/refund/fulfillment acceptance remains
open, so `GIFTING_CHECKOUT_ENABLED=0` is still intentional.

1. Configure the pinned Gift text and image models and run an opt-in real OpenRouter generation smoke
   under the existing spend and provider/privacy controls. Confirm it produces a schema-valid concept
   and amount, a bounded base64 image, and a locally cached WebP without retailer data.
2. Push the exact generated-inventory commit, wait for CI and CodeQL, deploy it to Render with both
   Gift flags still `0`, apply the cutover migration, and verify the request-tail job drain without
   provisioning a paid worker. Prove unsold legacy rows and legacy validation jobs are retired while
   sold rows remain untouched.
3. Fill the minimum inventory and inspect a bounded sample for safe concept identity, clear AI
   disclosure, price-lane policy, unique concepts, locally served WebP images, and bounded metadata.
4. Temporarily enable AI for a supervised canary. Confirm a hosted draw returns exactly nine cached
   generated concepts without waiting on OpenRouter, queues replenishment when stock is below the
   floor, survives a simulated text/image-provider outage, exercises the same-token Redis
   success-to-`429` boundary and concurrency behavior, emits bounded logs, and can return to `0`.
5. Deplete a bounded sample and prove presented, reserved, and sold items leave the available pool;
   replenishment restores the floor asynchronously; and failed image generations never create an
   eligible partial inventory item.
6. Configure a least-privilege Stripe test key and the exact `/api/gifts/webhook` signing secret.
7. Complete test-mode reservation conflict, payment, asynchronous payment, expiry, duplicate webhook,
   partial refund, full refund, payment-status, and staff fulfillment checks. Prove paid items remain
   retired and definitively failed or expired reservations become available again.
8. Confirm the public contribution/manual-purchase disclosure and internal support procedure, then
   enable `GIFTING_CHECKOUT_ENABLED=1` in a reviewed Blueprint change.

### 6. Observe and retain evidence

Record the exact commit, hosted checks, Render deploys, Blueprint sync, migrations, live endpoint
responses, provider test objects, and rollback result. Do not record API keys, webhook secrets,
handoff tokens, raw prompts, model output, contact data, or complete provider payloads.

## Verification and deployment evidence

This table records the combined release candidate and its hosted acceptance. Provider fulfillment
rows remain pending by design; a deployed, fail-closed product is not the same as an activated
provider workflow.

| Gate                           | Required evidence                                                                                                                                                               | Current record                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Root typecheck                 | Command result for `pnpm typecheck`                                                                                                                                             | Passed in the final local release checks on September 1, 2026.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Static-site typecheck          | Command result for `pnpm typecheck:site`                                                                                                                                        | Passed in the same final local run.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Lint                           | Command result for `pnpm lint`                                                                                                                                                  | Passed in the same final local run.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Unit/integration suite         | Passing/skipped totals for `pnpm test:int`                                                                                                                                      | Passed for the generated-concept release candidate: 651 tests passed and three opt-in tests skipped across 48 files. The checked-in suite remains deterministic; the separately supervised Gift provider canary spent provider credit and is recorded below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Payload production build       | Successful `pnpm build`                                                                                                                                                         | Passed; Next generated the readiness, diagnostic, Gift Draft, payment-status, and webhook route inventory.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Fixture static export          | Page count and export-verifier result from `pnpm build:site:fixture`                                                                                                            | Passed; 29 pages, 13 Build Notes, two prototype routes, and the required SEO/media assets were verified.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Browser acceptance             | Focused readiness, diagnostic handoff, Gift Draft, privacy, and public-smoke results                                                                                            | All 26 production scenarios passed against `https://saberistic.com`; 23 passed in the parallel run and three parallel page-load timeouts passed immediately on a one-worker retry. The opt-in live Umami delivery case remained skipped.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Payload migrations             | Status/order plus staging table and staff-access checks                                                                                                                         | All eight migrations applied in order against a disposable fresh Postgres database. Render startup then migrated `20260831_204405_architecture_diagnostic_funnel`, `20260831_205708_gift_payments`, and `20260831_210012_diagnostic_report_one_time_key` successfully; anonymous reads of both new private collections returned `403`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Blueprint validation           | Authenticated Render validation against the final file                                                                                                                          | Passed through authenticated Blueprint sync `dep-daavhje7bikc73cg91e0`, which finished live on the exact release commit at 22:02:26Z.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| OpenRouter readiness adapter   | One real minimized request using the local key                                                                                                                                  | The activation contract smoke passed through Azure using fallback routing at a total cost of $0.0010176.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Hosted readiness AI acceptance | One complete real-domain assessment with a validated enhancement                                                                                                                | Passed through Azure using fallback routing at a total cost of $0.0012168, and the result displayed the AI-tailored source. Telemetry contained no prompt, answers, symptom, or other input content.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| OpenRouter Gift adapter        | Structured concept and amount from the pinned text model plus a bounded base64 image from the pinned image model, converted to a locally cached WebP                            | Passed twice on the real key after the image-model allowlist was saved. The final instrumented canary used `openai/gpt-4.1-mini` for a strict $28 concept and `google/gemini-3.1-flash-lite-image` through `google-vertex/global` for one square image. It made exactly two OpenRouter calls, made no retailer request, normalized the image to a 17,024-byte WebP, stored no partial row, and recorded an exact provider cost of $0.034227.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| OpenRouter account gates       | Hard spend cap, plugin override review, logging/data-use settings, guardrail, pinned models, ZDR endpoints                                                                      | Passed for readiness and Gift inventory. The active key-specific Guardrail enforces a $10 monthly cap, ZDR, prompt-injection `Flag`, all eight sensitive-information presets, **Only Allow** providers Azure and Google Vertex, and **Only Allow** models `google/gemini-2.5-flash-lite`, `openai/gpt-4.1-mini`, `openai/gpt-4.1`, and `google/gemini-3.1-flash-lite-image`. The key separately has a $10 weekly credit limit. Paid-model training, prompt storage, broadcast, Response Healing, and Pareto Router defaults are off. The global free-training toggle is on, but no free or suffixed model is allowlisted. |
| Git release                    | Commit SHA, branch, and clean-tree confirmation                                                                                                                                 | `edc97f116e5f641b2757ef8d528f7b0ebfc42e15` was pushed to `main`; the working tree was clean after the push.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Hosted checks                  | GitHub CI and CodeQL run URLs/IDs                                                                                                                                               | GitHub [verify](https://github.com/saberistic-team/saberistic-v2/actions/runs/33443910331/job/99658402867), [CodeQL actions](https://github.com/saberistic-team/saberistic-v2/actions/runs/33443910325/job/99658407585), and [CodeQL JavaScript/TypeScript](https://github.com/saberistic-team/saberistic-v2/actions/runs/33443910325/job/99658407878) all completed successfully.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Render Payload deploy          | Deploy ID, commit, live timestamp, `/api/ready`, migration result, and error-log scan                                                                                           | Blueprint deploy `dep-daavhje7bikc73cg91e0` and secret-aware follow-on deploy `dep-daavhlo5cbfc738v3sg0` are live on `edc97f1`; the latter finished at 22:04:06Z. `/api/ready` returned `200` with `Cache-Control: no-store`, all three new migrations completed, and the release-window error-level log scan was empty. Readiness activation deploy `dep-daavtv942hec739fis8g` is also live with the exact account attestation and AI flag enabled.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Render Static Site deploy      | Deploy ID, commit, live timestamp, page count, and custom-domain smoke                                                                                                          | `dep-daavj1brjlhs7382bpig` is live on `edc97f1` as of 22:02:55Z. Render generated 30 static route outputs and verified 11 build notes, five prototype routes, and required media/SEO assets; `/readiness` and `/gifts` returned `200` on the custom domain.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Gift generated-inventory release | Exact commit/deploy, legacy cutover, active worker, ready four-lane cache, nine-record draw, image cache, bounded logs, and spend | `0691d2974031b41b294ee41acd35b35c7d3c3006` passed CI `33584937563` and CodeQL `33584936549`; quota correction `44a101368a488423117b86fcebe98ca68351658c` passed CI `33585731980` and CodeQL `33585731674`. Web deploy `dep-dabp6kpt0dsc73cte3vg` and Static Site deploy `dep-dabp6l1t0dsc73cte4vg` are live on `44a1013`; the forward cutover migration completed in 7 ms. Every concrete price lane has at least nine distinct available generated concepts, public status is `ready`, and the following drain was `idle`. A custom-domain mixed game displayed all nine cached concepts over three rounds and reached the finalist/contribution disclosure without a player-path provider wait. Selected artwork returned a 22,502-byte `image/webp`, a stable ETag, and conditional `304`; release-window logs contained no retailer request. OpenRouter Activity showed approximately $5.93 total key spend after the fill and game, below both $10 controls. Live Redis boundary, provider-outage, depletion, and final rollback drills remain follow-up hardening. |
| Render Key Value               | Resource ID, internal-only network state, web-service wiring, limiter acceptance                                                                                                | `red-daavhj67bikc73cg910g` is available in Ohio on the free plan, persistence off, `noeviction`, and an empty external IP allowlist. Blueprint wiring is live and the production readiness assessment completed through the shared limiter.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Stripe test-mode foundation    | Separate account, least-privilege keys, event-scoped snapshot webhooks, Render secret names, and healthy deploy                                                                 | Provisioned in the separate `Saberistic` test account (`acct_1UAeCbRSbTykmPAp`). Independent `saberistic-gift-render-test` and `saberistic-diagnostic-render-test` keys each grant **Checkout Sessions: Write** as their only non-`None` permission; an initial pre-install Gift key was expired immediately and replaced. Gift destination `we_1UAeOxRSbTykmPApg8H6rdML` sends `checkout.session.completed`, both async-payment outcomes, `checkout.session.expired`, and `charge.refunded` to `https://saberistic-web-staging.onrender.com/api/gifts/webhook`. Replacement Diagnostic destination `we_1UAenfRSbTykmPApigB7OOie` (`saberistic-diagnostic-render-test-v2`) sends `checkout.session.completed` and `checkout.session.async_payment_succeeded` to `https://saberistic-web-staging.onrender.com/api/stripe/diagnostic-webhook`; the original destination `we_1UAeRSRSbTykmPApCT18Wvhu` is disabled. Both active destinations use snapshot payloads and Stripe API `2026-08-26.dahlia`. `STRIPE_RESTRICTED_KEY`, `STRIPE_GIFT_WEBHOOK_SECRET`, `STRIPE_DIAGNOSTIC_RESTRICTED_KEY`, and `STRIPE_DIAGNOSTIC_WEBHOOK_SECRET` are installed directly on the Render web service without secret values entering the repository. A harmless signed probe returned `200` from each active route; the same Diagnostic probe signed with the retired secret returned `400`. Corrected rotation deploy `dep-dab183740ujc739hdm4g` became live at 23:55:39Z; `/api/health` and `/api/ready` returned `200`, with no release-window error or 5xx logs. No publishable key is needed because both integrations create Stripe-hosted Checkout Sessions server-side. `GIFTING_CHECKOUT_ENABLED=0` and `DIAGNOSTIC_ENABLED=0` remain intentional until their end-to-end acceptance suites pass. |
| Diagnostic fulfillment         | Stripe test session/event IDs, Resend IDs, private request ID, booking redirect, and negative tests                                                                             | Pending; do not include customer data.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Gift fulfillment               | Inventory reservation ID, Stripe test session/event IDs, sold/released transitions, status/refund checks, private payment ID, and negative tests                                | Pending; do not include payer data.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Rollback/deactivation          | Evidence that all four provider flags can be returned to `0` without removing deterministic readiness                                                                           | The retailer-backed Gift canary was returned to `0` by `dep-dabjlh3m8hqs73e37qu0`, and the generated-concept release was also deployed flags-off before supervised activation. Readiness and Gift AI are now enabled; `GIFTING_CHECKOUT_ENABLED=0` and `DIAGNOSTIC_ENABLED=0` preserve both payment boundaries. A final generated-release enable-to-disable-to-enable drill remains follow-up hardening. |

### Generated-concept inventory hosted release — September 2, 2026

The final product decision from the Gift Draft workstream is to keep the game quick and remove the
retailer dependency entirely. A pinned text model creates one plausible, unbranded physical gift
concept and a suggested amount inside the requested price lane. After deterministic schema, policy,
theme, price, and uniqueness checks, the server builds a neutral product-photography prompt and calls
the pinned `google/gemini-3.1-flash-lite-image` model through OpenRouter's dedicated Image API. The
request is pinned to the ZDR-listed `google-vertex/global` endpoint and sends only the endpoint's
advertised `1K`, square, single-image parameters. The base64 raster response is bounded, decoded,
inspected, converted to WebP, hashed, and stored with the concept in PostgreSQL. The UI identifies
both the object and artwork as AI-generated suggestions and does not claim that an item is stocked,
available from a retailer, or offered at an observed retail price.

A draw reads only cached inventory and never waits for concept or image generation. After a draw or
successful status check, a bounded request-tail job may replenish future stock; the optional
standalone worker remains available for supervised prefill or a future paid worker. Sold concepts
remain excluded by the existing inventory lifecycle, so a completed contribution creates a stock
shortage that later replenishment can fill. `GIFTING_CHECKOUT_ENABLED` remains an independent gate.

The forward cutover migration does not delete historical retailer rows or images. It first fails all
queued or running discovery and validation jobs, using `retailer_discovery_retired` or
`retailer_validation_retired` as appropriate, so an older release cannot write retailer inventory
after the cutover. It then marks every unsold legacy row invalid with
`retailer_inventory_retired`. New reads and stock counts independently require the generated-concept
provenance marker. Sold inventory, cached evidence, and payment history remain untouched; the
migration deliberately has no reversible `down` path. The former retailer-fetch and revalidation
experiments above remain useful historical evidence; the current generated release's hosted
migration, fill, game, and image-cache evidence is recorded above.

## Remaining gates

Readiness AI is activated, but the combined product must not be called fully activated until these
remaining external gates are closed:

1. keep the shared key's $10 monthly Guardrail, $10 weekly key limit, provider/model allowlists, ZDR,
   privacy settings, plugins, and versioned attestation under review; any material change requires
   the contract smoke and hosted acceptance to pass again;
2. make Diagnostic Stripe, Resend, booking, webhook, and 90-day review behavior pass in test mode
   before `DIAGNOSTIC_ENABLED=1`;
3. keep the activated Gift inventory under observation and complete the remaining staging-to-
   production hardening: a live four-success-then-`429` token test, IP/daily/concurrency behavior,
   cached draw during a simulated provider outage, bounded depletion/replenishment, a broader semantic
   variety/artwork review, and an enable-to-disable-to-enable drill. The exact deploy, cutover, four-
   lane fill, nine-card hosted game, image cache, no-retailer log scan, and spend review already pass;
4. make Gift Draft Checkout pass a complete Stripe test-mode flow: Checkout creation, paid webhook,
   verified return status, async success and failure, expiry, duplicate delivery, partial and full
   refunds, and staff fulfillment tied only to paid state. Prove atomic reservation, conflicting
   reservation rejection, paid-item retirement, definitive failed/expired release, and the rule that
   a refund does not silently restock a sold item. Add or explicitly resolve reconciliation for
   `refund.failed` and `refund.updated`, test hosted-database concurrency/idempotency, align the
   webhook destination and SDK API versions, document the contribution/manual-purchase/substitution/
   support/refund and 90-day deletion processes, and establish cross-system trace correlation before
   `GIFTING_CHECKOUT_ENABLED=1`;
5. monitor provider errors and spend without retaining prompts, reports, contact data, or provider
   secrets; and
6. replace the free Render database and Key Value resources with a backed-up, durable production
   plan before this staging proof is described as production infrastructure.

## Deactivation and rollback

The fastest safe response to provider, privacy, budget, payment, or fulfillment uncertainty is to
return the affected flag to `0`:

- `AI_ENHANCEMENT_ENABLED=0` preserves the complete deterministic readiness report;
- `GIFTING_AI_ENABLED=0` stops new Gift inventory deals and model-backed replenishment;
- `GIFTING_CHECKOUT_ENABLED=0` stops new Gift Draft Checkout creation; and
- `DIAGNOSTIC_ENABLED=0` stops new paid diagnostic requests.

Disabling a feature does not erase existing private payment or diagnostic records and does not
replace webhook reconciliation for already-created Stripe sessions. Revoke or rotate compromised
provider credentials, keep supported webhooks available long enough to reconcile outstanding test
or live sessions, and use a forward database fix unless a reviewed down migration and recovery plan
prove rollback safe.
