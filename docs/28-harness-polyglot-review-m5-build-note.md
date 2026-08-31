# Harness Platform M5 conditional polyglot-review build note

## Purpose

Build Note 012 documents Harness Platform Stage 1, Milestone 5 at exact public merge
`4bf5f68701dee38eecdc0830c4f1be0d937d3942`.

M5 is a conditional architecture review, not a second-runtime implementation. Its result is:

- M3–M4 contain deterministic correctness tests, golden evaluations, typed events, observability
  seams, and injected provider, process, PostgreSQL, and object-store boundaries;
- they do not contain a production-representative workload, an SLO, repeated latency percentiles,
  throughput, CPU or memory attribution, or a controlled runtime comparison;
- whole-suite and exit-gate durations are not component profiles; and
- TypeScript on Node ≥22 therefore remains the sole runtime because no evidence justified paying
  for another runtime boundary.

The shared development record also contains a Step 0 audit and a separately scoped hardening task.
That companion work is included because it made the final M5 report trustworthy, but it is not
counted as M5's four-file implementation diff.

## Source authority

| Source                          | Pin or identity                                   | What it supports                                                            |
| ------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------- |
| Harness Platform final merge    | `4bf5f68701dee38eecdc0830c4f1be0d937d3942`        | Final M5 decision on the hardened base                                      |
| M5 implementation commit        | `e9308b92a20adc4a49c889e110c58a4571c81a05`        | Initial four-file decision record                                           |
| M5 refreshed pull-request head  | `85342e35ecaa2a83a947f3c67dc9ff08133a2b7d`        | Exact head verified by the hardened gate                                    |
| M5 pull request                 | `#4 — M5: conditional polyglot review`            | Four-file diff, four green checks, and merge chronology                     |
| M5 CI run                       | `33446082649`                                     | `run-report/v2`, 535 tests, pre/post path scope, and zero violations        |
| Exit-gate implementation commit | `c5f920f87271b02f241ae39609376c75ee192748`        | Separate Step 0 trust-gate implementation                                   |
| Exit-gate merge                 | `ee759486a2af9abbbe37ac7763b8c9152b794cf8`        | Hardened base onto which M5 was refreshed                                   |
| Exit-gate pull request          | `#3 — M0: harden the bootstrap exit gate`         | Separate 22-file diff and green checks                                      |
| Development conversation        | Reviewed, intentionally not linked in public copy | Chronology, Step 0 audit prompt, adversarial debugging, and release handoff |
| Publication audit               | Clean checkout of exact merge on Node 22.19.0     | Independent tests, typecheck, and golden-scenario reproduction              |

Public source and hosted checks are authoritative. The private shared-chat URL, local filesystem
paths, internal reasoning and work durations, temporary PR-body files, and transient editor file
counters do not appear in the article. The development record's accumulated `Edited 183 files`
summary is not a Git release diff.

## Exact release boundaries

### M5 itself

Pull request #4 changed exactly four files relative to hardened base `ee75948`:

- `tasks/m5-polyglot-review.yaml`;
- `ARCHITECTURE.md`;
- `ROADMAP.md`; and
- `README.md`.

The authoritative PR diff is:

```text
4 files changed
99 insertions
8 deletions
```

No runtime source file, package dependency, service, executable boundary, deployment unit, FFI
bridge, or event type was added.

### Step 0 exit-gate hardening

Pull request #3 is a separate change:

```text
22 files changed
7,908 insertions
541 deletions
```

It merged first as `ee75948`. M5 was refreshed onto that base as `85342e35`, reran the hardened gate,
and then merged as `4bf5f68`. This ordering matters: M5's final evidence was produced by the stronger
gate instead of inheriting the initial 421-test result from before hardening.

The public record supports **checks-gated delivery**. It does not support a claim of independent
human peer review because PR #4 contains no approving review.

## M5 evidence decision

### Evidence that exists

- deterministic offline workspace tests;
- a golden scenario runner;
- typed events and scenario contracts;
- OpenTelemetry attachment seams;
- injected HTTP responses for the M3 provider adapter;
- an injected argument-vector-only executor for the M3 sandbox path;
- injected protocol fakes for the M4 PostgreSQL and object-store boundaries; and
- whole-command CI and exit-gate durations.

These prove and regress defined behavior. They do not attribute a runtime bottleneck.

### Evidence that does not exist

- a named production-representative workload;
- environment identity, repetitions, baseline, and target or SLO;
- repeated latency percentile distributions;
- sustained throughput evidence;
- CPU or memory profiles tied to a limiting hot path;
- evidence that I/O, an external dependency, data structure, or algorithm is not the constraint;
- a record of Node-side remedies attempted; or
- a controlled comparison showing that a specific foreign-runtime seam improves the target after
  operational cost.

The required wording is **insufficient evidence to add another runtime**. Do not write that Node was
proved fastest, optimal, scalable, or bottleneck-free.

## Reopening criteria

`ARCHITECTURE.md` permits the decision to reopen only with a new task manifest and a reproducible
profile that:

1. names the workload, environment, repetitions, target or SLO, and baseline;
2. reports latency percentiles or throughput plus CPU and memory attribution;
3. separates runtime cost from I/O, dependencies, data structures, and algorithms, and records
   attempted Node remedies; and
4. shows that one specific second-runtime boundary materially improves the target after build,
   deployment, security, observability, and ownership costs.

Language preference or a reference implementation is insufficient.

## Step 0 audit

The development record returned to the original bootstrap exit gate and found five gaps:

1. **Branch identity:** an existing task branch was not guaranteed to be checked out; arbitrary
   non-main branches and explicit branch metadata could be trusted without proving the checkout.
2. **Path scope:** working-tree status missed committed task changes, and the gate did not check
   again after tests wrote to the tree.
3. **Failure evidence:** invalid manifests and early Git failures could occur before a structured
   report was constructed.
4. **Policy attribution:** passing decisions and task/session/run identity were incomplete.
5. **Integrated bootstrap proof:** the repository did not yet prove one deterministic manifest → Pi
   adapter → edit → tests → report composition.

The audit also preserved one provenance limit: Git history does not prove that the original
repository bootstrap was performed by a live upstream Pi run.

## Hardened gate contract

### Canonical manifest and exact branch

- The authoritative manifest is a regular, non-symlinked `tasks/<id>.yaml` file at the Git root.
- Its task ID derives exactly one `tasks/<id>` branch.
- Local mode creates or selects that branch.
- Detached CI accepts only the matching head ref, immutable checked-out head SHA, and immutable base
  SHA supplied together from trusted workflow context.
- Repository root, branch, HEAD, base, merge base, Git metadata, manifest path, and manifest digest
  are rechecked during the attempt.

### Complete sampled delta

The path gate includes:

- committed changes from the verified base;
- staged, unstaged, and ordinary untracked changes;
- relevant ignored changes rather than a blanket ignored-file exemption;
- both endpoints of renames and copies;
- raw tracked-byte differences that clean filters could hide;
- file type and executable-mode changes; and
- per-worktree and common Git metadata relevant to the attestation.

`tasks/runs/**` is reserved for evidence regardless of a broad manifest path rule. Scope is evaluated
before the builder and tests and again afterward.

### TaskAgent and upstream Pi seam

`bootstrap` inserts one `TaskAgent` between branch preparation and the regular test gate. Its
production adapter targets upstream Pi 0.84.x with:

- no shell;
- offline-startup and non-interactive JSON protocol mode;
- no sessions, extensions, skills, prompt templates, or themes;
- the fixed file tools `read`, `grep`, `find`, `ls`, `edit`, and `write`; and
- bounded streamed JSONL and model-usage evidence.

Deterministic tests use an injected TaskAgent and a spawned Pi-protocol fixture. They prove Harness
composition and the streaming adapter contract. They do not execute the installed Pi binary or a
live model provider.

Approved test commands are parsed as one executable plus arguments and never interpreted by a
shell.

### Structured evidence

- Normal attempts use coherent `run-report/v2`.
- Invalid-manifest and early-Git attempts use strict `run-preflight-report/v1`.
- Historical `run-report/v1` remains readable but is not current gate attestation.
- Allow, ask, and deny `policy.decision` events carry task, session, run, action, subject, effect,
  and reason.
- Failure evidence retains an ordered trail when more than one boundary fails.
- Reports are written through a same-directory temporary file, sync, and atomic rename.
- A matching `run.recorded` event exists only inside a successfully committed normal report.
- Preferred report-write failure produces typed evidence and a verified fallback; total write
  failure can return validated in-memory evidence but cannot return a successful delivery claim.

## Adversarial debugging ledger

The hardening pass tested and closed bypasses involving:

- noncanonical, moved, replaced, mutated, or symlinked manifests;
- committed, ignored, copied, renamed, mode-only, raw-byte, and post-test changes;
- a builder that edits and then throws;
- shell chaining and command-prefix ambiguity;
- hostile Git index, metadata, replacement refs, routing environment, and clean filters;
- evidence-directory symlinks, multi-link inodes, reserved report paths, and report writers that
  return without committing the expected bytes;
- streaming Pi protocol errors, incomplete or forged budget usage, output size, timeouts, and late
  terminal messages; and
- ordinary descendant processes that could otherwise write after a test command exited.

Two false positives were narrowed rather than globally ignored: a committed MCP fixture under a
`node_modules`-shaped path and Vitest's hashed cache.

## Residual trust boundary

The hardened local exit gate remains a detective control over repeated filesystem samples, not an
atomic snapshot or preventive sandbox.

Trusted inputs include:

- the installed Git executable;
- the preflight object database and accepted mainish base;
- pre-existing repository configuration;
- the host that launches the builder and tests; and
- a workspace that privileged concurrent processes do not mutate.

An ordinary process group is terminated before the final sample, but a descendant that starts a
new session or daemonizes can escape that group. On Windows, only the direct child is synchronously
terminated. Use the M3 Docker sandbox-runner for untrusted tasks or when network, host-secret,
process, and preventive filesystem isolation are required.

## Verification evidence

### Public PR-head run

GitHub Actions run `33446082649` recorded:

```text
strict typecheck                         passed
test files                              36 / 36
offline correctness tests               535 / 535
golden scenarios                        1 / 1
pre-test changed policy paths           4
post-test changed policy paths          4
path-policy violations                  0
run-report/v2 status                    passed
deliverables.reportWritten              true
automated pull-request checks           4 / 4 green
```

The report's `tests.durationMs` is `16940`. This is one whole-suite CI duration, not a component
benchmark, latency claim, throughput result, or runtime comparison.

The report and SQLite session were uploaded as `gate-evidence-33446082649`. They are CI artifacts,
not committed repository files or a permanent evidence archive. The public article links the run
and pull request rather than claiming that the JSON is Git-backed.

### Independent publication audit

A clean checkout of exact merge `4bf5f68` under Node 22.19.0 reproduced:

- 535/535 tests across 36 files;
- strict TypeScript with exit code 0; and
- 1/1 golden scenario.

The local runner sandbox initially prevented loopback HTTP and WebSocket binds. Repeating the exact
suite with loopback enabled passed; this was an environment restriction, not a repository failure.
The public article reports only the successful clean-checkout result.

## Article and diagram implementation

The website implementation adds:

- `src/content/build-notes/HarnessPolyglotReview.tsx` — the 14-section evidence-led article;
- `src/components/build-notes/HarnessPolyglotReviewDiagrams.tsx` — four accessible semantic
  diagrams;
- a newest-first Build Note 012 manifest record in `src/lib/build-notes.ts`;
- the article import and slug mapping in the shared dynamic route;
- focused unit and browser acceptance;
- this durable implementation and production record; and
- no new article-specific client JavaScript or shared stylesheet changes.

The diagrams show:

1. the workload → attribution → causation → total-cost runtime gate;
2. correctness evidence present versus performance evidence missing;
3. canonical manifest → exact Git identity → pre/post scope → atomic report; and
4. PR #3 hardening → refreshed M5 head → fresh evidence → PR #4 merge.

Every diagram has a complete `role="img"` description, a visible caption, and a named
keyboard-scrollable frame. Existing Harness semantic-diagram styles are reused to avoid overlap
with unrelated work in the dirty tree.

The article remains a Server Component. The existing manifest automatically feeds static route
generation, canonical metadata, `BlogPosting` and breadcrumb structured data, the Build Notes index,
homepage journal, RSS feed, and sitemap.

## Claim controls

Use these formulations:

- **No qualifying profile was found**, not “Node was proved optimal.”
- **535 deterministic offline correctness tests**, not “a 535-test benchmark.”
- **Whole-suite CI duration**, not component latency or capacity.
- **Injected provider/process/protocol boundaries**, not live provider, Docker, PostgreSQL, S3, or
  Kubernetes load.
- **Checks-gated pull-request delivery**, not independent peer review.
- **Injected agent plus spawned Pi-protocol fixture**, not an installed live Pi run.
- **Sampled host exit gate**, not an atomic filesystem snapshot or preventive sandbox.
- **Uploaded CI report artifact**, not a committed or permanent evidence record.
- **Reversible conditional decision**, not a permanent ban on another language.

## Website verification plan

Before publication:

1. format only the eight M5 integration files;
2. run focused Build Note unit tests;
3. run TypeScript and ESLint for the website;
4. create a clean checkout of the exact candidate commit and run the full `pnpm verify` contract;
5. start the generated static export and run the focused M5 Playwright acceptance;
6. verify HTML title, canonical, description, article JSON-LD, breadcrumb JSON-LD, four diagrams,
   keyboard-scrollable frames, source links, and absence of the private shared-chat URL;
7. verify RSS and sitemap include `/build-notes/harness-polyglot-review-m5/`; and
8. stage and commit only the eight M5 files, preserving every unrelated change.

## Deployment and production acceptance

The release uses the existing checks-gated Render Static Site path:

1. push the isolated Build Note commit to `main`;
2. wait for website CI and CodeQL to succeed;
3. wait for the matching Render checks-gated deploy to become live;
4. verify the custom-domain article, metadata, structured data, feed, sitemap, CDN cache, and
   security headers; and
5. append the exact website commit, GitHub run IDs, Render deploy ID, generated page count, and live
   acceptance below in a documentation-only follow-up commit.

### Production record

Website implementation commit `e0436fe35197af3d2f7ef28251845c1d38e2421b` passed an
independent clean-checkout `pnpm verify`: both TypeScript checks, repository-wide ESLint, 540
passing tests with three reported skips, the Payload production build, and a 28-page fixture
static export containing 12 Build Notes and two prototype fixtures. The focused Chromium acceptance
for the M5 route also passed from that checkout.

The pushed commit passed website CI run
[`33448393215`](https://github.com/saberistic-team/saberistic-v2/actions/runs/33448393215)
and CodeQL run
[`33448392859`](https://github.com/saberistic-team/saberistic-v2/actions/runs/33448392859).
Render then built the same commit in checks-gated Static Site deploy
`dep-dab0dq95efls73fn4d10`. The remote-content build used public snapshot revision
`2e8da5a6f350`, generated 31 static pages, and verified 12 Build Notes plus five Payload prototype
routes before becoming live at `2026-08-31T22:58:37Z`.

Production acceptance at
[`/build-notes/harness-polyglot-review-m5/`](https://saberistic.com/build-notes/harness-polyglot-review-m5/)
confirmed:

- HTTP 200 on the article, RSS feed, and sitemap;
- the exact title, canonical URL, bounded description, `BlogPosting`, and `BreadcrumbList`;
- four accessible semantic diagrams and all 15 in-page links resolving to existing targets;
- the pinned Harness repository, commit, pull-request, source-file, and workflow evidence links;
- the new route in both `/build-notes/feed.xml` and `/sitemap.xml`;
- no private shared-chat URL, local filesystem path, or temporary evidence path in the HTML;
- no page-level horizontal overflow at 1440-pixel desktop or 390-pixel mobile viewports; and
- a warmed Cloudflare CDN hit with `s-maxage=300`, CSP, permissions policy, strict referrer policy,
  MIME-sniffing protection, and frame denial intact.
