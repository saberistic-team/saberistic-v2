# Harness Platform M7 deterministic-session-loop build note

## Purpose

Build Note 014 documents Harness Platform Stage 1, Milestone 7 at exact public merge
`41af384b6d990c53aefe81e826e59cc33f00c47c`.

M7 extends the M6 one-request runtime into one deterministic turn with multiple model and pure-tool
rounds. It adds:

- versioned, immutable message state and model-context snapshots;
- streaming text aggregation and strict tool-intention/terminal-response agreement;
- unknown- and invalid-tool observations that cannot reach authorization or execution;
- durable `tool.call` and policy/permission evidence before any allowed execution;
- sequential registered pure-tool calls whose observations enter the next model request;
- hard model-step, cumulative-token, and requested-tool-call budgets;
- per-round model deadlines and cooperative cancellation across model, permission, and tool waits;
- one terminal-finalization path; and
- additive compatibility with `runAgent()`, `Model.complete()`, and M6 streaming callers.

It does **not** add operational file/process/network/workspace tools, a sandbox, a live provider,
multi-turn follow-ups, mid-loop steering, context compaction, restart replay, exactly-once effects,
or a self-hosting CLI/service path.

## Source authority

| Source                   | Pin or identity                                    | What it supports                                                          |
| ------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------- |
| Harness Platform merge   | `41af384b6d990c53aefe81e826e59cc33f00c47c`         | Exact public M7 source and exact-merge workflows                          |
| Pull-request head        | `8e6bf735a8685f1f1deab63fe691f8df6c434166`         | One implementation commit and PR-head evidence                            |
| M6 base                  | `98924a66628bc66a88093ec6bee05f426f0fea9d`         | Authoritative M7 diff base                                                |
| Pull request             | `#6 — M7: deterministic minimal session loop`      | 15-file diff, merge chronology, checks, and post-merge automated review   |
| PR-head CI               | `33551227339`                                      | 623 tests, strict types, golden eval, 15-path gate, and retained artifact |
| PR-head CodeQL           | `33551224665`; differential check `100001054681`   | Successful analysis jobs; inconclusive differential caveat applies        |
| Exact-merge CI           | `33551269520`                                      | Successful push workflow on `41af384`                                     |
| Exact-merge CodeQL       | `33551268282`                                      | Successful push workflow on `41af384`                                     |
| Evidence artifact        | `gate-evidence-33551227339`, artifact `9817528203` | PR-head JSON and SQLite evidence; retention-bound                         |
| Current roadmap          | `9e535b696a742a8aea4b6f1e15a377f3d19a6672`         | Later M8–M76 decomposition only, not M7 implementation                    |
| Development conversation | Reviewed, intentionally not linked in the article  | Chronology and design intent only                                         |
| Publication audit        | Unretained local checkout of exact merge           | Local reproduction of tests, types, and golden scenario                   |

Public implementation claims follow the pinned merge, task, tests, pull request, and GitHub checks.
The shared-chat URL, local paths, hidden reasoning, stale intermediate branches, and temporary files
are not public evidence.

## Release boundary

PR #6 changed exactly 15 files relative to M6 base `98924a6`:

```text
EVENTS.md                                  +66 / -22
packages/events/src/schemas.ts             +84 / -10
packages/events/test/events.test.ts        +186 / -12
packages/kernel/src/index.ts               +1
packages/kernel/src/run.ts                 +61 / -14
packages/kernel/src/runtime.ts             +1,753 / -184
packages/kernel/src/state.ts               +396
packages/kernel/test/runtime.test.ts        +1,568 / -8
packages/kernel/test/state.test.ts          +159
packages/models/src/fake-model.ts           +20 / -2
packages/models/src/model-adapter.ts        +15 / -6
packages/models/src/model.ts                +25 / -16
packages/models/test/fake-model.test.ts     +48
packages/models/test/model-adapter.test.ts  +20 / -3
tasks/m7-deterministic-session-loop.yaml    +63

15 files changed · 4,465 insertions · 277 deletions
```

No dependency manifest or lockfile changed. Feature head `8e6bf73` is the sole implementation
commit. It merged as `41af384` on September 1, 2026.

## Delivery chronology and review language

The public chronology matters:

1. PR #6 was created at `2026-09-01T19:44:06Z`.
2. PR-head CodeQL started at `19:44:08Z`.
3. PR-head CI started at `19:44:09Z`.
4. The PR merged at `19:44:33Z`, before the displayed checks finished.
5. Both PR-head workflows subsequently passed.
6. Separate CI and CodeQL workflows passed on the exact merge.
7. Copilot posted a “changes recommended” review after merge.

Required wording: **merged first, subsequently verified**. Do not call this checks-gated or
peer-reviewed.

No human approval is visible. The post-merge Copilot review found a low-severity documentation
catalog mismatch: `EVENTS.md` omits optional `taskId` for `agent.started` and required `agentId` for
`agent.stopped`; its summary also mentions omitted optional `runId`, `sessionId`, and `turnId`
fields on the `tool.call` row. The visible discussion remains unresolved and current main still has
the mismatches. Use the schema/runtime as authority for exact fields and disclose the gap.

Both CodeQL analysis jobs succeeded. GitHub's [separate PR differential
result](https://github.com/saberistic-team/harness-platform/pull/6/checks?check_run_id=100001054681)
was inconclusive because one default-setup configuration was missing. Do not claim “zero
vulnerabilities” or a clean differential scan.

## Canonical runtime sequence

M7 is a single admitted turn with multiple sequential model/tool rounds:

```text
agent.started
turn.started
message.completed (user)
model.request
message.delta × 0..n
model.response (tool_calls)
message.completed (assistant with tool intentions)
tool.call
policy.decision
permission.requested       # ask only
permission.resolved        # ask only
tool.result
message.completed (tool observation)
model.request
message.delta × 0..n
model.response (stop)
message.completed (assistant)
turn.completed
agent.stopped
```

The bracketed model/tool portion can repeat while budgets permit. Tool calls are sequential. A
text-only completion omits the tool segment.

Every visible runtime event is appended first. After the admission pair, consumer advancement also
controls producer progress. The runtime does not invoke a model until the durable `model.request`
has been consumed and does not pull provider frames ahead of consumer demand.

## Versioned state

`MESSAGE_STATE_VERSION` and `MODEL_CONTEXT_VERSION` are both `1`.

- A prior context begins with a revision equal to its message count.
- Each appended user, assistant, or tool message increments the revision once.
- Each request records `contextVersion` and the exact `messageRevision` it consumed.
- Tool observations are typed tool messages with the provider's call ID and tool name.
- State, messages, tool definitions, arguments, and results cross as detached immutable snapshots.
  Model request containers, provider options, and normalized completion wrappers are detached but
  are not uniformly deep-frozen.

The normalizers reject accessors, symbols, cycles, named array properties, non-finite numbers,
excessive depth, excessive node counts, and oversized values. Safe-integer checks separately apply
to structural counters such as revisions, usage, budgets, and array lengths. The state bounds are
64 levels and 100,000 nodes; runtime tool JSON uses a 10,000-node bound plus byte limits.

`context.compacted` remains a schema-only contract. M7 does not produce compaction summaries or
rewrite context.

## Model-stream integrity

The provider-neutral stream has three frame types:

- `text.delta`;
- `tool.call`; and
- `response.completed`.

The runtime checks:

- deltas are nonempty, bounded, ordered, and precede tool intentions;
- concatenated deltas equal completed content when deltas exist;
- streamed and terminal tool calls agree by ID, name, order, and JSON value;
- finish reason agrees with tool presence;
- usage fields are safe and internally consistent;
- IDs are unique across the turn; and
- frames contain bounded ordinary data rather than accessors or exotic structures.

Malformed output fails with `RUNTIME_MODEL_STREAM_INVALID`. Tool intentions from that malformed
round cannot reach execution; effects completed in an earlier valid round are not undone.

`CompleteModelAdapter` keeps legacy `Model.complete()`: it emits complete tool intentions followed
by one terminal response and does not invent text deltas. Native adapters keep native streams. M7's
proof uses only FakeModel and deterministic local adapters.

## Tool admission and execution fence

The ordering invariant is:

```text
durable tool.call
→ strict registered-tool + argument validation
→ derive authorization intent
→ require the trusted pure boundary and choose policy
→ durable policy.decision
→ durable permission.requested/resolved, when ask
→ allowed pure-tool execution
→ durable tool.result
→ durable tool observation
→ next versioned model context
```

Unknown tools produce `TOOL_NOT_FOUND`; invalid arguments produce `TOOL_BAD_INPUT`. Both produce a
failed result observation without deriving policy, asking permission, or executing. Execution
exceptions and invalid outputs become typed observations so the model may recover in a later round.

Failure to append `tool.call`, `policy.decision`, or a required permission resolution prevents
execution. Failure to append `tool.result` can occur after execution and cannot undo it. M7 therefore
does not provide exactly-once external effects.

Only tools registered through the WeakMap-backed `{ kind: "pure" }` boundary are advertised and
executable. This is a trusted in-process marker, not a sandbox or proof of harmlessness. No
workspace, file, process, network, secret, remote, or MCP tool is in the M7 proof lane.

## Permission semantics

- `allow` executes only after the policy event is durable.
- With no `PermissionController`, a WeakMap-registered pure tool receives the built-in
  `runtime.m7.pure` allow decision.
- `ask` persists a request, waits without executing, and persists a resolution before an allowed
  execution.
- `deny` never asks and never executes.
- Missing, failing, canceled, or denying resolvers fail closed.
- Resolver decisions use the `operator` actor; synthetic denials use `kernel`.
- A run-scoped grant is keyed by action plus subject and may satisfy a later matching ask.
- A later hard deny always wins over a run-scoped grant.

## Runtime budgets

Do not confuse application runtime budgets with the task manifest's authoring allowance.

| Runtime metric | Boundary                                                                    |
| -------------- | --------------------------------------------------------------------------- |
| Steps          | Maximum model requests; defaults to eight                                   |
| Tokens         | Optional cumulative provider-reported prompt + completion usage             |
| Tool calls     | Optional count of requested intentions, including invalid and unknown calls |

A tool intention that crosses the tool-call limit remains durable, then produces a budget warning;
it receives no policy decision and cannot execute. Warnings normally emit once per metric at the
50-percent threshold.

A provider can overshoot a remaining token allowance inside one response because actual usage is
known afterward. M7 records that response and prevents the next model/tool unit. An exactly-at-limit
`stop` response may complete; an exactly-at-limit `tool_calls` response cannot start effects.

The task manifest's `100000` model tokens and `200` tool calls governed the development agent. They
are not defaults for `MinimalAgentRuntime`.

## Cancellation, timeout, and terminal semantics

- Each model request has a wall-clock deadline, default 60 seconds.
- Model timeout aborts that round and terminates as `failed`.
- Runtime cancel, caller signal, and iterator abandonment terminate as `canceled`.
- Cancellation reaches model, permission, and cooperative tool waits through `AbortSignal`.
- Iterator cleanup is best effort and bounded by a 100-millisecond grace period.
- Code that ignores cancellation cannot be force-killed by this in-process runtime.
- Terminal ordering is `turn.completed` then `agent.stopped` when both appends succeed.
- A pre-append terminal event-construction failure may retry once as `failed`.
- A durable append is never retried because the store may already have accepted it.
- Event-store failure can leave no complete terminal pair.

## Machine-readable task gate

The manifest allowed only:

```text
EVENTS.md
packages/events/**
packages/kernel/**
packages/models/**
tasks/m7-deterministic-session-loop.yaml
```

Network and Git push were denied. The CI `run-report/v2` records the same 15 changed paths before
and after tests with no violations.

## Development and adversarial hardening

The shared development chronology contributed context, while the merged code and tests remain the
authority for the final behavior:

1. The first implementation attempt was based on a stale pre-M6 checkout.
2. The patch was moved into an isolated tree rooted at exact M6 merge `98924a6`, preserving the old
   checkout's unrelated state.
3. A focused suite first established the two-round event sequence and persistence fences.
4. Adversarial review found that nested accessor-backed JSON could cross an early normalization
   boundary.
5. The final normalizer inspects descriptors without invoking getters and rejects accessors,
   symbols, exotic array properties, cycles, and bounded-shape violations.
6. A second review found that terminal-event construction could fail before producing a terminal
   pair.
7. Finalization was centralized; pre-append construction may retry once as a failed outcome, while
   uncertain durable appends are never retried.
8. Mutation, malformed-stream, cancellation, timeout, permission-wait, iterator-cleanup, and append
   races were added to the final 59-case runtime suite.

## Verification evidence

PR-head CI recorded:

```text
strict TypeScript                         passed
test files                               40 / 40
workspace tests                          623 / 623
M7 runtime cases                          59 / 59 (reported in PR)
golden scenarios                           1 / 1
changed paths checked before tests       15
changed paths checked after tests        15
path-policy violations                     0
run-report/v2                            passed
```

The report's `tests.durationMs` is `18741`. This is one complete test-command timing, not a load
test, benchmark, model-latency result, throughput figure, concurrency result, capacity result, or
performance improvement.

### Local publication audit

An unretained local clean detached checkout of exact merge `41af384` was installed from the lockfile
and verified under Node `26.5.0` and pnpm `11.15.1`:

```text
pnpm test       40 / 40 files · 623 / 623 tests passed
pnpm typecheck  passed
pnpm evals      1 / 1 deterministic scenario passed
```

The initial restricted publication run could not bind local HTTP/WebSocket test ports and therefore
failed only those socket-opening cases. Repeating the unchanged suite with loopback access passed
all 623 tests. The output is not uploaded or committed; this is a local environment diagnosis and
correctness reproduction, not public evidence or performance data.

## Evidence-artifact boundary

`gate-evidence-33551227339` has artifact ID `9817528203`, reported digest
`sha256:ce8dd4635b946558524bad242d0e1ca8c78d813cd9e13c399b1303d729466b57`, and no explicit
workflow retention override. It is temporary workflow evidence rather than a committed release
artifact.

The independently downloaded archive contains:

- one `run-report/v2` JSON for head `8e6bf73`; and
- `sessions.sqlite`.

The JSON contains seven serialized run events and a passing final report. SQLite has five events,
keeps the session active, and omits the final delivered/run-recorded events present in JSON. Do not
describe it as a closed terminal session log.

## Article architecture

The article is a static Server Component and adds no article-specific client JavaScript. It uses:

- 17 table-of-contents sections;
- at least 10 inspectable code/evidence blocks;
- four static accessible diagrams;
- one keyboard-scrollable current-truth table;
- exact GitHub commit, PR, workflow, review, task, source, and roadmap links; and
- canonical route metadata, BlogPosting structured data, RSS, sitemap, and static export through the
  existing shared build-note pipeline.

The diagrams show:

1. canonical two-round model/tool execution;
2. strict tool admission and policy-before-effect ordering;
3. message/context revisions across requests; and
4. completion, budget, cancellation, timeout, and failure convergence.

Each diagram has a visible caption, complete text description, inner `role="img"` label, and a
keyboard-focusable horizontal-scroll region for narrow screens.

## Implementation plan

1. Add Build Note 014 metadata first in the newest-first manifest.
2. Pin all M7 implementation links to merge `41af384`.
3. Use current commit `9e535b6` only for the later M8–M76 roadmap.
4. Add the Server Component article and four accessible static diagrams.
5. Register the slug in the shared build-note route.
6. Add unit coverage for metadata, source pin, claim controls, code blocks, diagrams, and regions.
7. Add public-route smoke coverage and a 390-pixel responsive acceptance test.
8. Run Prettier, unit tests, both TypeScript checks, ESLint, fixture static export, and focused
   Playwright acceptance.
9. Commit only the eight M7 publication paths and push.
10. Wait for website CI and CodeQL; let the checks-gated Render Static Site deploy complete.
11. Verify the custom-domain article, canonical/structured data, index, RSS, sitemap, CDN/security
    headers, responsive overflow, and exact source pin.
12. Record production evidence here in a docs-only follow-up commit.

## Claim controls

Use:

- “single-turn multi-round loop,” not general multi-turn session runtime;
- “registered pure tools,” not sandboxed tools;
- “durable intent and authorization before effect,” not exactly-once effects;
- “cooperative cancellation,” not guaranteed termination of arbitrary external work;
- “subsequently verified,” not checks-gated;
- “successful CodeQL analysis jobs with an inconclusive differential result,” not zero findings;
- “correctness tests,” not load or performance benchmarks; and
- “injected EventStore,” not production durability or restart recovery.

Avoid claims that M7 provides live provider proof, operational tools, MCP, network access, secrets,
parallel tool execution, byte-for-byte production determinism, context compaction, replay, restart,
multi-turn follow-ups, or self-hosting.

## Files

```text
src/content/build-notes/HarnessDeterministicSessionLoop.tsx
src/components/build-notes/HarnessDeterministicSessionLoopDiagrams.tsx
src/lib/build-notes.ts
src/app/(frontend)/build-notes/[slug]/page.tsx
tests/unit/build-notes.test.tsx
tests/e2e/frontend.e2e.spec.ts
docs/30-harness-deterministic-session-loop-m7-build-note.md
docs/README.md
```

## Production evidence

The first publication landed in website commit
`6fe6bf9533fc510e65492a7f452fa03f4a862bc2`. GitHub CI run `33635448493` passed
both TypeScript checks, ESLint, the full unit suite, the production build, and the reviewed-fixture
static export. CodeQL run `33635448085` passed both its Actions and JavaScript/TypeScript jobs.

The checks-gated Render Static Site deployed that exact commit as
`dep-dac27tmq1p3s739te88g`. Render prepared public content revision `2e8da5a6f350`, generated 33
static pages, and its export verifier found 14 Build Notes and five prototype routes before the
deploy became live on September 2, 2026.

Production acceptance on the custom domain verified:

- HTTP 200 for
  `https://saberistic.com/build-notes/harness-deterministic-session-loop-m7/`;
- the expected H1, short commit `41af384`, canonical URL, and BlogPosting structured data;
- four accessible diagram canvases and five keyboard-scrollable regions;
- no document-width overflow at the 390-by-844 acceptance viewport;
- M7 as the newest entry on the Build Notes index and in the RSS feed;
- the canonical M7 route in `sitemap.xml`;
- a Cloudflare CDN cache hit; and
- the deployed CSP, Permissions Policy, Referrer Policy, `X-Content-Type-Options`, and
  `X-Frame-Options` headers.

The focused production Playwright acceptance passed one of one tests. These website checks verify
publication and responsive behavior; they do not change the M7 runtime evidence boundary or create
performance, capacity, live-provider, sandbox, or exactly-once-effect proof.
