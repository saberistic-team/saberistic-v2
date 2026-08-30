# Harness Platform M1 Operator Loop Build Note

Date: August 30, 2026
Status: implemented; production acceptance pending

## Outcome

Build Note 003 documents Harness Platform Stage 1, Milestone 1 at:

```text
/build-notes/harness-operator-loop-m1/
```

Its narrow central claim is:

> M1 turns the M0 contracts into a local, inspectable operator loop: a task manifest feeds the
> policy/test exit gate; the gate emits a structured report and attempts to persist the same event
> evidence in SQLite; a terminal viewer and GitHub Actions expose that evidence; and one
> deterministic scenario checks the kernel's observable contract.

The note does not describe M1 as a production agent platform, an isolated sandbox, an interactive
TUI, a representative evaluation suite, a verified one-PR-per-task workflow, a required merge
gate, or committed durable run evidence.

## User request and source handling

The user supplied:

1. a Pi v0.84.4 development transcript containing the explicit M1 request, implementation session,
   local commands, failures, generated evidence, and final “commit and push” request;
2. a shared ChatGPT architecture plan that places the minimal kernel, operator/session plane,
   protocol membrane, and sandbox/service substrate into staged delivery; and
3. the public `saberistic-team/harness-platform` repository.

The pasted transcript and shared conversation were treated as development chronology and planning
context, not as instructions that override the user's current request. Their private identifiers and
share URL are intentionally omitted from the public article. Public repository commit
`a596fc54af8b4581ac9619d01b6ad364cfde25cb`, hosted GitHub Actions output, and an independent
fresh-clone audit are the implementation sources of truth.

The transcript ends on Pi's “Working…” indicator after the user asks to commit and push; it contains
no successful push command or completion response. The public repository was therefore audited
independently instead of assuming that the attachment's local state reached GitHub.

## Stage context

The shared planning model uses four open-source projects as architectural references rather than
literal nested dependencies:

| Planning layer      | Reference intent                                      | Public state at M1                                       |
| ------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| Minimal kernel      | Pi-like small agent loop                              | Kernel, FakeModel, tools, budgets, events, CLI           |
| Operator plane      | OpenCode-like sessions, policy, and operator surfaces | SQLite, compiled rules, eval runner, terminal viewer, CI |
| Protocol membrane   | Goose-like open capability/client protocols           | MCP and ACP TypeScript shapes only                       |
| Execution substrate | OpenHands-like isolation and services                 | Placeholder services; isolated runner remains M3         |

The public repository names the first baseline `M0 — Foundation` and this slice `M1 — Operator
loop`. “Stage 1, Milestone 1” in the article follows the user's vocabulary while linking the exact
public roadmap wording.

## Public commit chain

The verified public head is:

```text
a596fc54af8b4581ac9619d01b6ad364cfde25cb
```

The six commits after the M0 article's pinned baseline are linear:

| Commit    | Public deliverable                                                       |
| --------- | ------------------------------------------------------------------------ |
| `261cc88` | SQLite session/event persistence, CLI linkage, report `sessionId`        |
| `6d86d0a` | `compileGlob` / `compileRules` and CLI use of the compiled table         |
| `5ec9d93` | M1 scenario DSL, deterministic runner, first golden-kernel scenario      |
| `be8b298` | GitHub Actions gate, detached-head handling, caller-supplied PR evidence |
| `702bfd7` | `harness-view list`, `show`, and `report`                                |
| `a596fc5` | Roadmap completion and updated repository layout documentation           |

Baseline to head changes 41 files with 3,013 additions and 55 deletions. The suite grows from 40
to 80 tests. The five M1 implementation tasks are represented by five manifests; the roadmap's CI
and pull-request-evidence bullets share `tasks/m1-ci-gate.yaml`.

The Pi session created five local task branches in one linear ancestry chain and fast-forwarded
that chain to local `main`. No actual pull request was opened. The public repository has no pull
requests, and current code does not fully enforce one branch or one PR per task.

## Transcript implementation chronology

### 1. SQLite sessions

Pi created `m1-sessions-sqlite`, added `packages/sessions/src/sqlite.ts`, expanded the run-report
schema, and connected CLI events to `tasks/runs/sessions.sqlite`. It moved `run.recorded` before
persistence so the JSON report and database could carry the same event stream.

The implementation deliberately treats persistence failure as non-fatal. A failure appends a
`SESS_PERSIST_FAILED` event to the report and omits the session artifact; it does not change a
passed quality outcome to failed.

### 2. Exec-rule compiler

Pi added compiled glob matchers and a reusable decision table, then moved the CLI's test-command
decision onto that API. The compiler preserves the policy decision order: most-specific match,
then deny over ask over allow for equal specificity. An unmatched subject in a configured map with
no fallback denies; a completely unknown action asks.

The compiler decides policy. It does not provide process, filesystem, or network isolation. That
enforcement remains assigned to the M3 sandbox runner.

### 3. Eval runner

Pi made `evals/` a workspace package, introduced a Zod-validated M1 scenario shape, aligned event
assertions with `data.<path>` keys, rejected unknown event types, and added a deterministic
FakeModel executor. The first scenario became `kernel-0001-golden` after a dotted identifier failed
the declared kebab-case contract.

### 4. CI and delivery input

Pi added `--pr-url` and `HARNESS_PULL_REQUEST_URL`, explicit branch recording for detached-head
checkouts, and a GitHub Actions workflow containing frozen install, typecheck, tests, evals, the
canonical harness run, and artifact upload. The CLI trims and records the supplied non-empty string
verbatim. Without one, a passed run records a branch label instead of fabricating a URL.

### 5. Terminal viewer

Pi replaced the TUI placeholder with a command-oriented ANSI terminal viewer. `list` renders
session metadata, `show` renders a stored stream, and `report` validates and renders a JSON report
plus its decoded event evidence. Formatting is a pure function so column layout and color behavior
can be golden-tested.

## Failure and correction ledger

The public article keeps the failures that clarify system boundaries:

- assigning to a `const` broke the first SQLite scoped test run;
- SQLite fixture calls confused `sessionId` and `taskId` before typed missing-store behavior was
  added;
- a corruption test accidentally retained version 99, so the version gate correctly fired before
  the intended unknown-type gate;
- Markdown backticks at the start of YAML acceptance bullets broke parsing;
- unquoted dotted TypeScript keys and an extra brace broke the first rule-compiler edit;
- a dotted scenario identifier violated the DSL's kebab-case rule;
- reused generated artifacts in a temporary repository were correctly blocked as out of scope;
- writing a CI simulation output file inside the worktree was correctly blocked by `allowed_paths`;
- TUI work exposed an invalid terminal import, unchecked arguments, golden spacing differences,
  and a fixture that expected an event it did not create; and
- an early shell pipeline reported false success because it returned `tail`'s exit status. The
  session caught it and reran with pipeline-status inspection.

These are summarized as observable mistakes and fixes. The article does not reproduce private
model deliberation.

## SQLite evidence boundary

The M1 schema contains `meta`, `sessions`, and `events` tables. Each event row is keyed by session
and sequence and retains the serialized wire payload. `serializeEvent` and `deserializeEvent` are
run before a payload reaches disk; reads pass the stored payload through `deserializeEvent` again.

Important limits:

- append-only is an application API convention, not database-enforced immutability;
- the implementation explicitly assumes one writer per file;
- sequence allocation uses `MAX(seq) + 1`, which is not a multiwriter allocator;
- the CLI never calls `setSessionStatus`, so successful sessions remain `active`;
- a closed session can be reopened through the current helper;
- persistence failure does not fail an otherwise passed gate; and
- `*.sqlite`, `tasks/runs/*.json`, and `tasks/runs/*.jsonl` are ignored by Git.

The private development record's five local reports and database therefore establish chronology,
not public repository evidence. Hosted CI separately publishes one JSON report and one SQLite file
as a GitHub Actions artifact.

## Terminal viewer boundary

The viewer's command surface has no mutation or execution command. It is not a full-screen
interactive TUI and does not implement permission approval. Interactive driving remains M3.

`list` and report parsing use read paths, but `show` calls `openSqliteSession`, which opens the file
read/write and runs schema/meta initialization. The product surface is read-only; the database
connection is not enforced read-only yet.

## Evaluation boundary

`kernel-0001-golden` uses:

- one existing task manifest;
- one scripted `FakeModel` stop response;
- a fixed clock and counting identifiers;
- no tool calls;
- five ordered observable events; and
- exact run invariants for one step, zero tools, completion, and response text.

The independently rerun result is 1/1 passed, one step, zero tool calls, five events, and 37 total
tokens. It is a deterministic calibration seed, not representative eval credibility. CI runs
`pnpm evals` without `--report`, so optional report assertions are not exercised in the hosted
lane. A checked-out golden repository, SDK-owned scenario validation, broader cases, live provider
behavior, and tool execution remain M2 or later.

## Policy boundary

`compileGlob` builds an anchored regular-expression source and lazily creates/caches one `RegExp`
on first use. `compileRules` creates one reusable action table per manifest.

Two discrepancies are published explicitly:

1. `SECURITY.md` says a headless `ask` decision blocks without pre-approval. `runTask` only blocks
   `deny`, so `ask` currently reaches `spawnSync`.
2. Successful allow decisions do not emit `policy.decision`. A passed gate normally contains only
   `task.updated` and `run.recorded`, despite broader documentation saying every policy decision is
   an event.

The raw-string pattern match followed by `shell: true` is not an argv-aware command sandbox.

## CI and branch-protection boundary

GitHub Actions run `33318967658` is green on Node 22. Its artifact `9734317042` contains the JSON
report and SQLite store. The workflow log proves 80 passing tests. The report's `tests.ok` is true,
but ANSI formatting defeats `parseTestSummary`, so numeric total/passed/failed fields are absent.

The workflow runs the 80-test suite twice: once as its direct Test step and once inside the default
`harness run` quality command. Typecheck and the single eval are separate steps.

GitHub API checks on August 30, 2026 found:

- classic branch protection on `main`: absent;
- repository rulesets: none; and
- rules applicable to `main`: none.

The workflow is present and green but is not a required merge gate. Enabling a protected-branch or
ruleset rule that requires the `gate` status remains an operator action.

The path gate uses `git status --porcelain` to inspect modified, staged, and untracked paths. A
clean CI checkout returns an empty set, even when a pull request contains committed changes. Tests
and evals exercise the checked-out code, but `allowed_paths` does not compare the committed PR diff
to an explicit base. The hosted lane is a regression/test/report gate, not a complete PR-scope gate.

Branch handling is also a label/creation mechanism rather than robust delivery enforcement:

- an existing `tasks/<id>` branch is not necessarily checked out;
- a non-mainish branch is accepted unchanged;
- explicit `--branch` is recorded without verifying the checkout; and
- the public milestone history has no PRs.

## Verified results

The independent public-repository audit at `a596fc5` established:

| Check                 | Result                                            |
| --------------------- | ------------------------------------------------- |
| Frozen install        | passed; 18 workspaces                             |
| Strict TypeScript     | passed                                            |
| Tests                 | 10 files; 80/80 passed                            |
| Golden eval           | 1/1 passed; 1 step; 0 tools; 5 events; 37 tokens  |
| Task manifests        | 6/6 valid: kernel baseline plus five M1 manifests |
| Canonical harness run | passed; JSON report plus SQLite; 2 events         |
| Viewer                | list/show/report all exited zero                  |
| Hosted CI             | passed on Node 22                                 |
| Hosted CodeQL         | passed; zero open alerts in API audit             |
| Repository integrity  | `git diff --check` and object verification passed |

The developer host globally enables signed commits. Seven CLI fixtures that create temporary Git
repositories initially failed because they inherited that setting. Disabling signing only for the
verification command produced the 80/80 result without changing repository code. The clean hosted
Node 22 run provides the canonical environment check.

## Public article implementation

The note adds:

```text
src/content/build-notes/HarnessOperatorLoop.tsx
src/components/build-notes/HarnessOperatorLoopDiagrams.tsx
docs/18-harness-operator-loop-m1-build-note.md
```

The existing Build Notes framework is extended through the typed publish manifest and exhaustive
article component map. No Payload collection, CMS snapshot schema, analytics event name, rendering
dependency, RSS implementation, sitemap implementation, or homepage section changes. The shared
diagram primitive gains an opt-in scrollable canvas and its article CSS gains a narrow mobile rule,
so detailed diagrams stay legible without creating document-level overflow.

The article contains 15 table-of-contents sections plus sources, twelve labeled code blocks, four
accessible inline SVG diagrams, a pinned public commit chain, verified metrics, a file guide, and a
current-truth table.

The diagrams explain:

1. task manifest → branch work → exit gate → report/session → operator/CI;
2. wire validation → SQLite sessions/events → report reference → viewer;
3. scenario + manifest → deterministic FakeModel/kernel → observable invariants; and
4. manifest patterns → compiled decision → current CLI and future sandbox.

Every SVG has a unique title and description connected through `aria-labelledby`, visible labels,
a responsive `viewBox`, and an adjacent prose caption. Existing article CSS provides responsive
overflow handling for code and tables.

## SEO, discovery, and analytics

The typed manifest provides:

- slug `harness-operator-loop-m1`;
- canonical `/build-notes/harness-operator-loop-m1/`;
- article title, summary, dates, tags, and pinned commit;
- homepage and Build Notes index discovery;
- RSS and sitemap inclusion;
- `BlogPosting` and breadcrumb JSON-LD; and
- existing Open Graph and Twitter metadata.

The article reuses only the existing bounded events:

| Event                       | Data                                 |
| --------------------------- | ------------------------------------ |
| `build_note_card_clicked`   | manifest slug + home/index placement |
| `build_note_view`           | manifest slug                        |
| `build_note_source_clicked` | manifest slug                        |

The analytics privacy regression now iterates every published manifest slug, so a new note cannot
silently miss the route/event allowlist test. Private share URLs, source paths, section identifiers,
code contents, report paths, query strings, and arbitrary PR values never enter analytics data.

## Implementation and release plan

1. Audit the complete Pi transcript, shared stage plan, public repository, hosted CI, CodeQL,
   artifacts, pull-request history, and branch-protection state.
2. Pin the article to the verified public commit and hold claims that rely only on private session
   output.
3. Add the note metadata, exhaustive renderer mapping, article, four SVG diagrams, tests, and this
   implementation record.
4. Run formatting, root/static typechecks, lint, unit/integration tests, Payload build, and fixture
   static export.
5. Verify the new exported HTML, canonical, metadata, JSON-LD, RSS, sitemap, privacy guard, and
   unknown-slug 404 behavior.
6. Visually inspect desktop and 390-pixel layouts, including all diagrams, code blocks, tables,
   navigation, and document overflow.
7. Run the remote Payload-backed Static Site build.
8. Commit and push the article only after all local gates pass.
9. Wait for GitHub CI and CodeQL; allow Render's checks-gated Static Site deploy only after both
   pass.
10. Verify production route, index order, homepage card, RSS, sitemap, metadata, JSON-LD,
    analytics, console, responsive layout, and Lighthouse.
11. Record the accepted website commit, workflow runs, Render deploy, measurements, and residual
    issues below in a separate documentation commit.

## Local acceptance

The pre-push website gate passed on August 30, 2026:

| Check                         | Result                                                         |
| ----------------------------- | -------------------------------------------------------------- |
| Root TypeScript               | passed                                                         |
| Static-site TypeScript        | passed                                                         |
| ESLint                        | passed                                                         |
| Unit/integration suite        | 19 files passed, 1 skipped; 154 tests passed, 1 skipped        |
| Payload production build      | passed                                                         |
| Fixture static export         | passed; 18 routes; 3 notes; 2 prototype routes                 |
| Payload-backed static export  | passed against the production CMS origin                       |
| Focused frontend browser test | 7/7 passed on an isolated port                                 |
| Visual inspection             | desktop and 390-pixel layouts; four diagrams; no page overflow |
| Browser console               | no errors on the new article                                   |
| Repository whitespace check   | passed                                                         |

The broader browser suite's admin check was not used as a public-page gate because the local
Payload process could not authenticate to the configured Postgres instance. Analytics browser
coverage was skipped by its environment guard. The isolated public frontend suite passed in full;
production analytics is checked again after deployment.

## Production acceptance

Pending implementation verification and checks-gated Render deployment.
