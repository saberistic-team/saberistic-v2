# Three Lovable prototypes: publication and Build Note 004

## Outcome

Saberistic now treats The Last Press, Psych Lab, and Borrowed Brain as one source-verified product
family without pretending that a reachable deployment is automatically safe to launch.

The implementation has two outputs:

1. three evidence-backed Payload prototype records, created idempotently by a migration; and
2. one Git-authored Build Note with pinned source links and four accessible SVG diagrams.

The public-launch decision is intentionally different for each product:

| Product        | Repository commit | Recorded application URL                    | Public lifecycle | Launch result                         |
| -------------- | ----------------- | ------------------------------------------- | ---------------- | ------------------------------------- |
| The Last Press | `169df55`         | `https://the-last-press.lovable.app`        | Concept          | Held on verified security/reliability |
| Psych Lab      | `b47cfa4`         | `https://getpsychlab.app`                   | Concept          | Held on verified security findings    |
| Borrowed Brain | `dadf92f`         | `https://borrowed-thinking-lab.lovable.app` | Prototype        | Open for synthetic sample decisions   |

`appUrl` remains recorded in Payload for every project. The public mapper only emits an external
launch destination when availability is `available`, the lifecycle is launchable, and an
administrator has approved the launch. This preserves the requested Lovable destinations while
keeping a known-unsafe destination out of the primary public action path.

## Sources and ownership

The source set is:

- [The Last Press](https://github.com/saberistic-team/the-last-press) at
  `169df55cec710c269ddbf4cfc98a8e41a6d37392`;
- [Psych Lab](https://github.com/saberistic-team/psych-test-forge) at
  `b47cfa4690e389ca5119ded54c509c434f23d583`;
- [Borrowed Brain](https://github.com/saberistic-team/borrowed-thinking-lab) at
  `dadf92f699ff47f95e4f274463ea4b0ed0e8e92b`; and
- the public [Saberistic Lovable profile](https://lovable.dev/@saberistic), used only as discovery
  evidence for its visible project listings.

All three repositories belong to `saberistic-team`, but none declares a software license. Their
Payload provenance is therefore `organization_owned`, fully reviewed for the claims used here, and
`NOASSERTION` for license. The Build Note calls them public repositories, not open-source software.

The Lovable profile exposed Psych Lab and Borrowed Brain during review. The Last Press was not
listed there; its canonical deployment was verified from the repository and the reachable app.

## What the three products do

### The Last Press

The Last Press is a single shared countdown game. A signed-in player spends one scarce press; a
PostgreSQL function locks the active season, enforces the cooldown and allowance, resets the shared
deadline, and writes the press atomically. Supabase Realtime distributes season and press changes,
while clients correct their display clocks from server time. If nobody presses before expiry, the
last player wins and selects the next season's duration direction.

The current deployment is not launch-approved. The audited build can remain stuck in settlement
because settlement has no independent scheduled executor, and authenticated users can update
security-relevant fields on their own profile row through the current RLS policy. Mobile overflow
and an empty-history `Infinity:NaN` rendering bug were also reproduced.

### Psych Lab

Psych Lab turns a creator prompt into a questionnaire draft. It streams a structured model result,
coerces it, validates it with Zod, and performs targeted repairs before saving a draft. A human
creator edits and approves the words. Respondents then use a join code or public listing, answer
Likert items, and receive deterministic sum/mean, reverse-scored, subscale, and attention-check
results. AI authors the draft; it does not read or interpret respondent answers.

The current deployment is not launch-approved from Saberistic. Six open high-severity CodeQL
findings remain, including model-authored SVG content rendered after incomplete sanitization. The
application also handles accounts, questionnaire responses, and payment flows without a committed
automated test suite. Generation progress is persisted, but the generation request is not a durable
background job.

### Borrowed Brain

Borrowed Brain converts one decision into a structured council. It selects three to five of 14
reasoning lenses, asks one high-value question per lens, gathers independent positions, runs a
cross-examination, lets each lens revise its position, and produces a decision board. Anonymous
sessions live in the browser; signing in enables saving, sharing, and later outcome review through
Supabase.

The public launch boundary is synthetic-only: visitors should use a fictional or disposable sample
decision, avoid professional or sensitive scenarios, and not rely on the output as advice. The
production build and TypeScript checks passed, and the HEAD CodeQL analysis passed. The repository
still has no automated tests, its lint/format check fails, ownership protection relies on RLS, and
share slugs use `Math.random`.

## Shared construction pattern

The three products converge on the same rapid-product stack:

```text
Lovable product iteration
        │
        ▼
React 19 + TanStack Start + Vite + Tailwind/Radix
        │
        ├── server functions ──► secret-bearing AI/payment calls
        │
        └── Supabase ──────────► Auth + Postgres + RLS + optional Realtime
        │
        ▼
public GitHub repository + Lovable/Cloudflare deployment
```

The shared value is not the component library. It is the fast conversion of a product question into
a complete interaction loop with a server boundary and a persistent domain model. The shared risk
is equally important: a successful production build does not prove authorization, state recovery,
output safety, or mobile correctness.

## Build Note implementation

Build Note 004 is Git-authored because its claims are coupled to immutable source commits. It adds:

- a multi-repository Build Note manifest contract rather than forcing a three-repository article
  into one misleading “verified commit” field;
- pinned links to implementation files in all three repositories;
- real or explicitly condensed code excerpts;
- one shared architecture diagram and one product-flow diagram per prototype;
- accessible SVG `<title>` and `<desc>` elements, plus keyboard-scrollable diagram canvases where
  the flow is wider than a phone; and
- explicit verification and launch-gate sections.

The route is `/build-notes/three-lovable-prototypes/`. It is included in metadata, JSON-LD, RSS,
sitemap generation, analytics privacy validation, static export discovery, and smoke tests through
the existing Build Notes manifest.

## Payload publication migration

The migration performs a reviewed, transactional content import rather than relying on manual UI
entry:

1. Find an existing administrator to record as reviewer for any approved launch.
2. Upsert one verified, public, `prototype-hub` evidence source per repository URL.
3. Find a prototype by slug.
4. Preserve an existing published editorial record unchanged.
5. Otherwise create or update the reviewed record with evidence, provenance, safety copy, and
   application URL.
6. Skip per-record static rebuild hooks while the migration runs.
7. Let the CMS deployment finish the migration before explicitly rebuilding the Static Site once.

The down migration is intentionally non-destructive. Published editorial records may have been
edited after deployment and must never be silently deleted during rollback.

## Verification matrix

| Check                       | The Last Press | Psych Lab  | Borrowed Brain |
| --------------------------- | -------------- | ---------- | -------------- |
| Public repository at pin    | Verified       | Verified   | Verified       |
| Deployment reachable        | Yes, degraded  | Yes        | Yes            |
| Clean production build      | Pass           | Pass       | Pass           |
| Separate TypeScript check   | Not recorded   | Pass       | Pass           |
| Automated application tests | None found     | None found | None found     |
| Repository lint/format      | Fail           | Fail       | Fail           |
| Launch from Saberistic      | Held           | Held       | Sample-only    |

The website release itself must pass the root type checks, lint, unit/integration tests, Payload
production build, fixture static build, and static-export verifier. Production acceptance then
checks all three prototype records, the Build Note route, canonical metadata, all source actions,
and the absence of a launch action for held products.

## Next engineering work

1. Restrict The Last Press profile updates to non-sensitive columns or RPC-only writes, then add an
   independent idempotent settlement scheduler and fix the reproduced responsive/history defects.
2. Remove or safely sandbox Psych Lab's model-authored SVG path, close all high-severity alerts, and
   add authorization, scoring, billing, and browser tests before reconsidering launch approval.
3. Add cryptographically random share slugs and explicit owner predicates in Borrowed Brain, then
   build end-to-end tests for the full council and persistence paths.
4. Add repository CI that runs type, lint, tests, and production builds for every prototype instead
   of treating a host build or scheduled security scan as the complete quality gate.
