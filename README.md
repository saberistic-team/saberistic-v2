# Saberistic V2

Saberistic V2 is a product-engineering site and prototype hub built with Next.js, Payload CMS, and PostgreSQL. The first vertical slice provides an editorial prototype registry, a public homepage and prototype catalogue, strict publication gates, and deployment infrastructure for Render.

The product direction, research record, content evidence rules, AI-readiness design, Umami implementation, and phased implementation plan live in [`docs/`](./docs/README.md).

## Current slice

- a separate Next.js static export for the public site, served by Render's CDN without sleeping
- Payload Admin and APIs in the existing Docker web service
- PostgreSQL-backed prototypes, evidence sources, Experience, Case Studies, media, users, and site settings
- draft-first seed data based on audited public repositories
- public homepage, prototype index, and prototype detail pages
- fail-closed launch buttons: a URL is never enough on its own
- liveness (`/api/health`) and database readiness (`/api/ready`) endpoints
- deterministic unit tests and browser smoke tests
- privacy-guarded, self-hosted Umami pageviews and a small validated event contract
- a complete 20-question Production Readiness Check with versioned scoring, hard blockers,
  deterministic fallback reports, and an optional bounded OpenRouter explanation
- a consented Architecture Diagnostic handoff with private lead storage, Resend report delivery,
  fixed $200 hosted Stripe Checkout, verified payment fulfillment, and calendar-provider routing
- Gift Draft: a quick three-round gift game for AmirSaber backed by durable inventory of real
  retailer products, server-cached descriptions and images, signed contributions, and
  Stripe-hosted one-time Checkout
- Render Key Value-backed AI request, token, daily-call, and concurrency limits
- multi-stage production images, GitHub Actions CI, and a Render Blueprint
- CMS publication hooks plus a daily reconciliation build for the public static site

Self-hosted Umami is live as disposable validation infrastructure. The owner has authorized temporary collection from the public site through `umami.saberistic.com` while the service still shares the expiring Free database; this is an explicit launch exception, not production-grade analytics acceptance. The readiness implementation keeps scores, levels, blocker IDs, and next-step routing in deterministic code. Its OpenRouter layer can only rewrite bounded explanations and reorder approved actions; the dedicated key, pinned models, Guardrail, ZDR route, budget controls, hosted smoke, and reviewed activation flag are live. Gift Draft's inventory discovery and Stripe Checkout have independent flags and acceptance gates, so the real-product game can be activated without accepting payments.

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
- Gift Draft: <http://localhost:3000/gifts>
- Production Readiness Check: <http://localhost:3000/readiness>
- Payload Admin: <http://localhost:3000/admin>
- health: <http://localhost:3000/api/health>
- database readiness: <http://localhost:3000/api/ready>

The assessment works locally without OpenRouter or Redis by returning its complete deterministic
report. To test the optional explanation, configure an independent 32-character rate-limit secret,
a Redis/Valkey URL, a dedicated OpenRouter key, and two distinct pinned model IDs in `.env`; then set
`OPENROUTER_ACCOUNT_GATES_CONFIRMED=2026-09-01.1` and `AI_ENHANCEMENT_ENABLED=1`. Keep the key
server-side and leave both gates off until the account-side privacy, plugin, routing, and spend
controls in [the implementation record](./docs/06-openrouter-readiness-check-implementation.md) are
verified.

On the existing Render service, add the four `sync: false` OpenRouter values in the Dashboard, then
commit the `AI_ENHANCEMENT_ENABLED` Blueprint change after verification. Render does not prompt an
existing service for newly added `sync: false` variables, and Blueprint sync would overwrite a
Dashboard-only feature-flag change.

Direct local development requests use a loopback-only abuse bucket when no trusted proxy header is
present, so the optional local AI explanation does not require a fabricated client-IP header.

Gift Draft is intentionally a quick, easy game rather than a live retailer-search experience. A
draw deals nine eligible records from durable PostgreSQL inventory and never waits for OpenRouter or
a retailer page. Each inventory record represents a real product from an actual retailer and keeps
the retailer URL, observed price, product description, and the retailer product image copied to
Saberistic-owned storage. Serving the cached description and image keeps a temporary retailer or
image-host failure from breaking the current game.

Every draw also performs a best-effort minimum-stock check and queues background replenishment when
inventory is low. The background discovery path uses OpenRouter-grounded product research, applies
the deterministic schema, budget, hostname, prohibited-product, and uniqueness rules, and downloads
the selected retailer description and image before making the product eligible. Separate periodic
jobs revisit non-sold products to refresh availability, price, description, and image. A failed or
ambiguous revalidation marks an item for later review without blocking a draw that already has a
usable cached copy; a product confirmed unavailable or unsafe is retired from future deals.

The durable queue is drained in a bounded, single-flight task after status and draw responses, using
the existing web service so ordinary staging does not add a paid worker. While initial stock is being
built, the page reports “restocking” and checks again automatically. The standalone
`pnpm start:gifts:inventory-worker` command remains available for a supervised prefill or a future
dedicated worker, but it is not provisioned by the staging Blueprint.

To try the external path locally, configure PostgreSQL, Redis/Valkey,
`GIFTING_RATE_LIMIT_SECRET`, `GIFT_QUOTE_SECRET`, the pinned `OPENROUTER_GIFT_*_MODEL`
configuration, and the existing `OPENROUTER_API_KEY`; then set
`OPENROUTER_ACCOUNT_GATES_CONFIRMED` to the current policy version and
`GIFTING_AI_ENABLED=1`. Keep a hard OpenRouter key spend limit and leave the feature off if its
research contract or account privacy controls change. Run `pnpm test:gifts:openrouter:live`; the
opt-in test exercises the actual research, retailer page, image normalization, and cache-insert path
and consumes a small amount of OpenRouter credit.

Gift Draft is still intentionally paused in Render. The first hosted AI canary returned nine cards,
but review found one item out of stock and four price disagreements, so it was rolled back. A later
request-time retailer verifier passed local samples but failed twice when hosted: the under-$30 draw
checked 21 pages and verified only four (`load: 8`, `budget_above: 6`), while the mixed draw checked
46 and verified only six (`load: 26`). Those failures established the current boundary: retailer
research and validation belong in the background, while the player path deals cached inventory.
The replacement still needs an exact hosted inventory migration, request-tail discovery and
revalidation drain, fast nine-item cached draw, minimum-stock replenishment, same-token Redis limit acceptance,
bounded-log review, and enable-to-disable rollback drill. Checkout remains independently off until
its Stripe and inventory-lifecycle acceptance gates pass.

Checkout additionally requires a least-privilege `STRIPE_RESTRICTED_KEY` and an independent
`STRIPE_GIFT_WEBHOOK_SECRET`. Run the committed Payload migrations, register
`/api/gifts/webhook` as the Stripe event destination, and exercise the complete payment, signed
webhook, private `gift-payments` queue, and verified return-status path in Stripe test mode before
setting `GIFTING_CHECKOUT_ENABLED=1`. The API uses Stripe SDK 22.4.0 and API version
`2026-07-29.dahlia`, creates a one-time hosted Checkout Session, and never accepts a
browser-supplied price. Checkout atomically reserves the selected inventory item. A confirmed paid
contribution retires it from inventory; a definitively failed or expired Checkout releases it for a
future draw. The displayed retailer, product, and price remain purchase inspiration: Stripe sends a
fixed gift contribution to Saberistic rather than placing an order with the retailer, and AmirSaber
may use it toward the suggested gift, related costs, or a similar gift if the listing differs or
changes. Define the availability, substitution, and refund process before enabling live mode. Keep
every OpenRouter, Stripe, quote-signing, and rate-limit secret server-side and out of committed
`.env` files.

The Gift Draft Stripe event destination must deliver `checkout.session.completed`,
`checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
`checkout.session.expired`, and `charge.refunded`. The restricted key needs Checkout Session create,
retrieve, and list permissions. Checkout creation also fails closed when the webhook secret is
missing, so the app cannot accept a new contribution without signed reconciliation being ready.

The paid Architecture Diagnostic remains disabled unless every fulfillment dependency is present.
Configure Redis, `DIAGNOSTIC_RATE_LIMIT_SECRET`, `READINESS_HANDOFF_SECRET`, an independent least-privilege
`STRIPE_DIAGNOSTIC_RESTRICTED_KEY`, the endpoint signing value
`STRIPE_DIAGNOSTIC_WEBHOOK_SECRET`, a sending-only `RESEND_API_KEY`, a verified
`RESEND_FROM_ADDRESS`, and an HTTPS `DIAGNOSTIC_BOOKING_URL`; then set
`DIAGNOSTIC_ENABLED=1`. Register the webhook directly on the Payload service at
`/api/stripe/diagnostic-webhook` and test the complete payment-to-email path in Stripe test mode.
Because the Render service already exists, add every new `sync: false` diagnostic value in its
Dashboard manually; Blueprint updates preserve those declarations but do not prompt for newly added
secret values. Keep `DIAGNOSTIC_ENABLED=0` in the Blueprint until that setup is complete.
The browser never supplies the $200 price, Stripe metadata contains only an opaque request ID, and
the customer&apos;s authenticated report is emailed without being stored in Payload. Checkout returns
to a neutral site confirmation; only the signature-verified paid webhook emails the scheduling URL,
so a delayed or unconfirmed payment cannot unlock the calendar step. Keep the feature off until the
private 90-day review process, delivery retry/reconciliation, and scheduling-provider calendar
behavior are verified. Treat the calendar URL as routing, not authorization: require attendee
identity in the scheduler and reconcile each booking to a paid private request before the call.

After adding `OPENROUTER_API_KEY` to `.env`, run the opt-in live adapter smoke test with
`pnpm test:openrouter:live`. It sends one minimized synthetic assessment and can consume a small
amount of OpenRouter credit; ordinary `pnpm test:int` runs skip it.

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
pnpm build:site:fixture
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

Payload Admin: <https://saberistic-web-staging.onrender.com/admin>

Payload CMS/API: <https://saberistic-web-staging.onrender.com>

Umami staging: <https://saberistic-umami-staging.onrender.com>

Umami custom host: <https://umami.saberistic.com> (DNS verified, certificate issued, and the heartbeat and tracker script responding over HTTPS on 2026-08-30)

[`render.yaml`](./render.yaml) defines the first staging environment:

- the Payload/Next.js Docker web service;
- the public Next.js Static Site, built from a strict versioned Payload snapshot;
- one additional Free Umami Docker web service using a pinned official base image;
- one PostgreSQL database;
- one Key Value service holding only expiring readiness counters; client-address and browser-token
  buckets are HMAC-derived;
- separate `public` (Payload) and `umami` (analytics staging) schemas in that database;
- generated, service-specific website and Umami secrets;
- idempotent committed migration before the free staging server starts;
- draft-first, idempotent content migrations that preserve editorial decisions;
- `/api/ready` for website/database readiness and `/api/heartbeat` for Umami process health;
- `/api/readiness/assess` for stateless deterministic assessment plus the optional OpenRouter
  explanation;
- `/api/diagnostics/requests` for the rate-limited, consented lead/report/Checkout handoff and
  `/api/stripe/diagnostic-webhook` for signature-verified paid fulfillment;
- `/api/gifts/ideas` for a rate-limited deal from cached retailer-product inventory plus a
  best-effort background replenishment signal,
  `/api/gifts/checkout` for signed-quote Stripe Checkout creation, `/api/gifts/webhook` for
  signature-verified payment fulfillment, and `/api/gifts/payment-status` for the verified return
  screen.

The Blueprint currently uses Render's free staging plans. Its single PostgreSQL instance is temporary, expires on 2026-09-27 unless replaced or upgraded, has no backups, and is not the production data plan. The Free Key Value instance is also volatile: a restart can clear readiness counters, so those are soft staging controls and the dedicated OpenRouter spend limit remains the hard cost cap. Umami uses an isolated role and schema in that shared instance. Render's cross-environment private-network isolation requires a Pro workspace, so it remains disabled in this Free staging Blueprint and is a production upgrade gate. The public `Saberistic Production` Website record has ID `8bdad921-34a9-43cb-bc70-9e1c71efa911`; the tracker is limited to `saberistic.com,www.saberistic.com`, honors Do Not Track, strips queries and fragments, and validates pageview and event payloads before sending. Free web services also cannot use Render's pre-deploy phase, so startup migrations are an explicit single-instance staging compromise. The last successful public static deployment remains available if Payload sleeps or a later content build fails, but it is not a database backup. Before production, choose a Pro workspace with private-network isolation and paid web/database/Key Value plans, run migrations in `preDeployCommand`, override the Docker start command to `node server.js`, give Umami a dedicated database with backup/retention procedures, add S3-compatible object storage for Payload media, and complete the backup/restore runbook in [`docs/09-operations-security-and-runbook.md`](./docs/09-operations-security-and-runbook.md). The static publishing and cutover record is in [`docs/14-render-static-site-rollout.md`](./docs/14-render-static-site-rollout.md).

### Waking the Free services for a demo

Render Free web services spin down after 15 minutes without inbound traffic. The public Static Site does not sleep. Use the local helper to wake Payload and Umami once before an editorial or analytics review, or keep those two services warm for a short, deliberate demo window:

```bash
pnpm render:warm
pnpm render:demo
pnpm render:demo -- --minutes 90
```

`render:demo` defaults to 60 minutes, checks both services every 10 minutes, and has a hard 120-minute maximum. It is intentionally not a permanent anti-sleep daemon. The workspace receives 750 shared Free instance hours each month; two services kept continuously awake would require about 1,440 hours in a 30-day month and exceed that allowance. Upgrade the service that requires continuous availability instead of running an indefinite keepalive loop.

## Content safety model

Repository ownership proves control of source, not product maturity. Public prototype records carry explicit provenance, lifecycle, availability, sensitivity, verification, and launch-approval fields. Publication hooks reject unsafe combinations, and public queries request only an allowlisted projection while respecting Payload access control.

Resume and internet research are source leads, not blanket permission to publish claims. Approved wording and held claims are recorded in [`docs/03-verified-content-and-ai-brief.md`](./docs/03-verified-content-and-ai-brief.md).
