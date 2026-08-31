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

Built does not imply deployed, and deployed does not imply activated. The default release remains
fail-closed: the deterministic readiness report works without a model, while OpenRouter, diagnostic
payment, and Gift Draft provider paths stay off until their independent gates pass.

## Source authority

| Source                                                                                       | Original request                                                                                                                                                                                                              | How it is used here                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Build AI diagnostic lead funnel](https://chatgpt.com/s/cx_6a95ee3962c481918c291ccbc034c461) | Turn the architecture-diagnostic action into a lead generator with a questionnaire, email delivery, OpenRouter, fixed $200 Stripe Checkout, calendar routing, and Resend messages to the customer and `inbox@saberistic.com`. | Product intent and required fulfillment path. The repository is authoritative for the implemented safety and data boundaries.                                                                          |
| [Add AI gifting game](https://chatgpt.com/s/cx_6a95ee59a0e0819199e5c4a585527b99)             | Build a game-like stream of varied online gift ideas for AmirSaber using OpenRouter and Stripe.                                                                                                                               | Product intent. The repository is authoritative for the three-round draft, signed quote, contribution, webhook, and manual-purchase contract.                                                          |
| Current Production Readiness Check task                                                      | Complete and deploy the readiness function using the locally supplied OpenRouter key.                                                                                                                                         | Implementation and release work. The local key and live adapter smoke support the adapter contract only; they do not establish that account-level spend, ZDR, plugin, or guardrail gates are complete. |
| [OpenRouter readiness implementation](./06-openrouter-readiness-check-implementation.md)     | Versioned readiness policy, model boundary, privacy controls, rate limiting, and activation conditions.                                                                                                                       | Detailed technical and operational source of truth for the readiness feature.                                                                                                                          |
| [Operations and security runbook](./09-operations-security-and-runbook.md)                   | Key rotation, deployment, migration, retention, provider, and incident procedures.                                                                                                                                            | Shared operational boundary for all three workstreams.                                                                                                                                                 |

The shared conversations explain intent. They are not evidence that code was deployed, a provider
account was configured, a payment completed, or a customer message was delivered.

## Convergence summary

| Workstream                 | Built in the release candidate                                                                                                                                                               | Deployed                                                                                               | Activated                                                                                                                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production Readiness Check | Yes: controlled assessment, deterministic report, bounded optional OpenRouter adapter, handoff token, static UI, backend route, and Key Value-backed limiter are present.                    | Yes: release `edc97f1` passed CI and CodeQL, deployed to both Render services, applied its migrations, and passed the real-domain deterministic flow. | Deterministic path only. The key and pinned models are installed, but the model path remains off pending the versioned account attestation, hard spend cap, account privacy/guardrail review, and `AI_ENHANCEMENT_ENABLED=1`. |
| Architecture Diagnostic    | Yes: report-bound questionnaire, minimized private record, customer and owner email paths, fixed-price Checkout, verified webhook, and scheduling redirect are present.                      | Yes: the routes and private schema are deployed, the three new migrations completed, and anonymous collection reads return `403`.                | No. `DIAGNOSTIC_ENABLED=0` remains the safe setting until Stripe, Resend, booking, webhook, retention, and live test-mode fulfillment gates pass.                                                               |
| Gift Draft                 | Yes: three-round game, citation-checked OpenRouter search, signed quote, fixed contribution Checkout, payment status, webhook/refund processing, and private fulfillment record are present. | Yes: the game and APIs are deployed, its private schema migrated, the page passes hosted smoke, and the disabled ideas route returns `503`.       | No. The OpenRouter adapter passed a local-key live search, but public AI and Checkout remain off pending the account gates and Stripe fulfillment gates.                                                         |

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
  └─ Gift Draft choices ────────────────> OpenRouter web search + cited ideas
                                         └────> signed contribution quote
                                               └─> Stripe Checkout + verified fulfillment record

Shared Render Key Value
  └─ expiring, HMAC-derived rate, token, daily, checkout, and concurrency counters
```

The shared OpenRouter key does not make the products one trust domain. Readiness forbids tools and
allows the model to rewrite only bounded explanation fields. Gift Draft intentionally requires a
web-search tool and then verifies citations, price bounds, and result structure. Diagnostic
fulfillment does not call OpenRouter at all; it authenticates the already completed report.

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

The locally supplied `OPENROUTER_API_KEY` has been exercised by the opt-in live adapter smoke. That
proves the request can reach OpenRouter and that one real response can pass the adapter contract. It
does not prove that the account has a hard spend cap, that workspace plugin defaults cannot
override the request, that the selected primary and fallback models remain acceptable, or that all
eligible endpoints meet the intended ZDR and provider policy. Those are separate activation gates.

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
- The server requires OpenRouter web search, strict JSON, at least one recorded search request,
  HTTPS citation-backed source URLs, nine unique ideas, allowed categories, USD price bounds, and
  local schema validation.
- The OpenRouter adapter uses one pinned model per server-tool request and performs model fallback
  inside the application. OpenRouter's current server-tool path rejected the otherwise supported
  multi-model request form. The request explicitly selects managed Exa search, caps search/tool
  work and result volume, disables every plugin, requires ZDR and denies provider data collection.
  Because strict provider-parameter filtering currently excludes the viable server-tool route, the
  adapter relies on its exact local JSON, search-usage, citation, URL, uniqueness, and price checks
  to fail closed if a provider ignores a field.
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

### Endpoint and data boundary

- `POST /api/gifts/ideas` performs the rate-limited search and returns cited ideas with signed
  quote tokens.
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
  shared OpenRouter key, two pinned gift-search-capable model IDs, an account spend cap, the intended
  ZDR/provider policy, and a successful real search smoke.
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

### 1. Ship the fail-closed release

1. Regenerate Payload types after the final collection definitions.
2. Review and apply the committed `diagnostic-requests` and `gift-payments` migrations in order.
3. Run the full release checks in the evidence table below.
4. Validate `render.yaml` against Render's current Blueprint schema.
5. Commit and push one reviewed release candidate with all provider feature flags still `0`.
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

1. Configure pinned gift-search models and run the opt-in real OpenRouter search smoke with the
   account spend/ZDR controls already in place.
2. Enable `GIFTING_AI_ENABLED=1` only after a live draw returns nine distinct cited listings and
   the deployed Redis limits are observed.
3. Configure a least-privilege Stripe test key and the exact `/api/gifts/webhook` signing secret.
4. Complete test-mode payment, asynchronous payment, expiry, duplicate webhook, partial refund,
   full refund, payment-status, and staff fulfillment checks.
5. Confirm the public contribution/manual-purchase disclosure and internal support procedure, then
   enable `GIFTING_CHECKOUT_ENABLED=1` in a reviewed Blueprint change.

### 6. Observe and retain evidence

Record the exact commit, hosted checks, Render deploys, Blueprint sync, migrations, live endpoint
responses, provider test objects, and rollback result. Do not record API keys, webhook secrets,
handoff tokens, raw prompts, model output, contact data, or complete provider payloads.

## Verification and deployment evidence

This table records the combined release candidate and its hosted acceptance. Provider fulfillment
rows remain pending by design; a deployed, fail-closed product is not the same as an activated
provider workflow.

| Gate                         | Required evidence                                                                                          | Current record                                                                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Root typecheck               | Command result for `pnpm typecheck`                                                                        | Passed in the final local `pnpm verify` run on August 31, 2026.                                                                                 |
| Static-site typecheck        | Command result for `pnpm typecheck:site`                                                                   | Passed in the same final local run.                                                                                                             |
| Lint                         | Command result for `pnpm lint`                                                                             | Passed in the same final local run.                                                                                                             |
| Unit/integration suite       | Passing/skipped totals for `pnpm test:int`                                                                 | 537 passed and 3 opt-in live tests skipped across 44 files.                                                                                     |
| Payload production build     | Successful `pnpm build`                                                                                    | Passed; Next generated the readiness, diagnostic, Gift Draft, payment-status, and webhook route inventory.                                      |
| Fixture static export        | Page count and export-verifier result from `pnpm build:site:fixture`                                       | Passed; 27 pages, 11 Build Notes, two prototype routes, and the required SEO/media assets were verified.                                        |
| Browser acceptance           | Focused readiness, diagnostic handoff, Gift Draft, privacy, and public-smoke results                       | All 26 production scenarios passed against `https://saberistic.com`; 23 passed in the parallel run and three parallel page-load timeouts passed immediately on a one-worker retry. The opt-in live Umami delivery case remained skipped. |
| Payload migrations           | Status/order plus staging table and staff-access checks                                                    | All eight migrations applied in order against a disposable fresh Postgres database. Render startup then migrated `20260831_204405_architecture_diagnostic_funnel`, `20260831_205708_gift_payments`, and `20260831_210012_diagnostic_report_one_time_key` successfully; anonymous reads of both new private collections returned `403`. |
| Blueprint validation         | Authenticated Render validation against the final file                                                     | Passed through authenticated Blueprint sync `dep-daavhje7bikc73cg91e0`, which finished live on the exact release commit at 22:02:26Z.            |
| OpenRouter readiness adapter | One real minimized request using the local key                                                             | Passed August 31, 2026 with `openai/gpt-4.1-mini` through Azure using fallback routing: 2,445 tokens and $0.0015888.                            |
| OpenRouter Gift adapter      | One real cited nine-item search using the local key                                                        | Passed August 31, 2026 with `openai/gpt-4.1`: nine validated ideas, 24 citations, 9,919 tokens, four executed server-tool steps, and $0.041726. |
| OpenRouter account gates     | Hard spend cap, plugin override review, logging/data-use settings, guardrail, pinned models, ZDR endpoints | Pending; readiness AI must remain off.                                                                                                          |
| Git release                  | Commit SHA, branch, and clean-tree confirmation                                                            | `edc97f116e5f641b2757ef8d528f7b0ebfc42e15` was pushed to `main`; the working tree was clean after the push.                                      |
| Hosted checks                | GitHub CI and CodeQL run URLs/IDs                                                                          | GitHub [verify](https://github.com/saberistic-team/saberistic-v2/actions/runs/33443910331/job/99658402867), [CodeQL actions](https://github.com/saberistic-team/saberistic-v2/actions/runs/33443910325/job/99658407585), and [CodeQL JavaScript/TypeScript](https://github.com/saberistic-team/saberistic-v2/actions/runs/33443910325/job/99658407878) all completed successfully. |
| Render Payload deploy        | Deploy ID, commit, live timestamp, `/api/ready`, migration result, and error-log scan                      | Blueprint deploy `dep-daavhje7bikc73cg91e0` and secret-aware follow-on deploy `dep-daavhlo5cbfc738v3sg0` are live on `edc97f1`; the latter finished at 22:04:06Z. `/api/ready` returned `200` with `Cache-Control: no-store`, all three new migrations completed, and the release-window error-level log scan was empty. |
| Render Static Site deploy    | Deploy ID, commit, live timestamp, page count, and custom-domain smoke                                     | `dep-daavj1brjlhs7382bpig` is live on `edc97f1` as of 22:02:55Z. Render generated 30 static route outputs and verified 11 build notes, five prototype routes, and required media/SEO assets; `/readiness` and `/gifts` returned `200` on the custom domain. |
| Render Key Value             | Resource ID, internal-only network state, web-service wiring, limiter acceptance                           | `red-daavhj67bikc73cg910g` is available in Ohio on the free plan, persistence off, `noeviction`, and an empty external IP allowlist. Blueprint wiring is live and the production readiness assessment completed through the shared limiter. |
| Diagnostic fulfillment       | Stripe test session/event IDs, Resend IDs, private request ID, booking redirect, and negative tests        | Pending; do not include customer data.                                                                                                          |
| Gift fulfillment             | Search smoke, Stripe test session/event IDs, status/refund checks, private payment ID, and negative tests  | Pending; do not include payer data.                                                                                                             |
| Rollback/deactivation        | Evidence that all four provider flags can be returned to `0` without removing deterministic readiness      | Current safe posture is all four provider flags at `0`: the five-section deterministic readiness flow passed, the Gift ideas route returned `503`, and no payment route was activated. A live enable-then-disable rollback drill remains pending. |

## Remaining gates

The fail-closed release is deployed, but the combined product must not be called fully activated
until these remaining external gates are closed:

1. add a hard OpenRouter account spend limit and the exact versioned account attestation;
2. confirm account/workspace plugin defaults, guardrails, logging/data-use choices, pinned models,
   and ZDR routing satisfy the readiness policy before either AI flag changes;
3. make Diagnostic Stripe, Resend, booking, webhook, and 90-day review behavior pass in test mode
   before `DIAGNOSTIC_ENABLED=1`;
4. make Gift Draft Checkout, webhook, status, refund, manual fulfillment, and support behavior pass
   in test mode before its Checkout flag changes;
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
