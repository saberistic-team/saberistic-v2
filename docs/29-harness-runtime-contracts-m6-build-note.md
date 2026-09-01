# Harness Platform M6 runtime-contracts build note

## Purpose

Build Note 013 documents Harness Platform Stage 1, Milestone 6 at exact public merge
`98924a66628bc66a88093ec6bee05f426f0fea9d`.

M6 is the first compatibility-first slice of a Pi-like minimal agent kernel. It adds:

- `AgentRuntime.run()`, `steer()`, and `cancel()`;
- a streaming `ModelAdapter` and completion-only compatibility adapter;
- a narrow injected `EventStore` port;
- compatibility-target `Tool` and operational `Workspace` interfaces;
- `MinimalAgentRuntime` for one text-only model request;
- strict turn, message, steering, compaction, and terminal event variants;
- append-before-yield ordering and consumer-driven backpressure; and
- typed steering, cancellation, abandonment, duplicate, missing, and terminal-run behavior.

It does **not** implement the policy-gated tool loop, execute tools, wire a workspace to the model,
compact context, add a production event database, resume after restart, exercise a live provider, or
self-host a Harness task.

## Source authority

| Source                   | Pin or identity                                      | What it supports                                                       |
| ------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------- |
| Harness Platform merge   | `98924a66628bc66a88093ec6bee05f426f0fea9d`           | Exact public M6 source and post-merge checks                           |
| Pull-request head        | `6de0fd70086c7a70c69e07da863cf7677b479f22`           | Manifest-gated PR evidence and retained artifact                       |
| M5 base                  | `4bf5f68701dee38eecdc0830c4f1be0d937d3942`           | Authoritative M6 diff base                                             |
| Pull request             | `#5 — M6: runtime contracts and event vocabulary`    | 15-file diff, three commits, checks, and merge chronology              |
| PR-head CI               | `33449593023`                                        | 568 tests, types, golden eval, 15-path gate, and `run-report/v2`       |
| PR-head CodeQL           | `33449591341`                                        | Actions and JavaScript/TypeScript analysis                             |
| Post-merge CI            | `33449750084`                                        | Exact-merge tests, typecheck, and golden scenario                      |
| Post-merge CodeQL        | `33449749513`                                        | Exact-merge static analysis                                            |
| Evidence artifact        | `gate-evidence-33449593023`, artifact `9779276413`   | PR-head JSON report and SQLite session; retention-bound, not permanent |
| Development conversation | Reviewed, intentionally not linked in public article | Chronology and roadmap intent only                                     |
| Publication audit        | Clean temporary checkout of exact merge              | Independent reproduction of tests, typecheck, and golden scenario      |

The private shared-chat URL, local filesystem paths, internal reasoning, temporary files, and stale
local roadmap draft do not appear as public implementation evidence.

## Release boundary

Pull request #5 changed exactly 15 files relative to M5 base `4bf5f68`:

```text
ARCHITECTURE.md                            +53
EVENTS.md                                  +63
packages/events/src/schemas.ts             +132 / -1
packages/events/test/events.test.ts        +110
packages/kernel/src/index.ts               +1
packages/kernel/src/runtime.ts             +1,074
packages/kernel/test/runtime.test.ts       +568
packages/models/src/fake-model.ts          +51 / -9
packages/models/src/index.ts               +1
packages/models/src/model-adapter.ts       +59
packages/models/src/model.ts               +73 / -1
packages/models/test/fake-model.test.ts    +151 / -1
packages/models/test/model-adapter.test.ts +123
packages/models/test/model.test.ts         +23
tasks/m6-kernel-contracts.yaml             +64

15 files changed · 2,546 insertions · 12 deletions
```

No dependency manifest or lockfile changed.

The implementation history is:

1. `3fbdb9085658fe322581af6343f99b285f27bcd4` — streaming model contracts;
2. `fbd026f4f54d071dcaa81b1648882d3e3c7a41c8` — normalize streamed text deltas; and
3. `6de0fd70086c7a70c69e07da863cf7677b479f22` — minimal runtime and event contracts.

The PR merged as `98924a6`. There was no approving review. The only review entry says the automated
reviewer could not run because its quota was exhausted. Required wording: **checks-gated and
author-merged, not peer-reviewed**.

## Roadmap boundary

The development conversation decomposed the desired self-hosting kernel into:

```text
M6  runtime contracts + event vocabulary      complete
M7  deterministic multi-round session loop   planned
M8  bounded workspace + five tools           planned
M9  steering, follow-ups + compaction         planned
M10 durable replay + restart                  planned
M11 offline kernel-backed self-host runner    planned
M12 live self-hosted Harness doctor           planned
```

A separate local `tasks/m6-minimal-kernel-roadmap` branch contains an uncommitted, stale roadmap
draft based on M5. It is not public, not merged, and not release evidence. The article must not say
that draft shipped.

## Runtime contract

The runtime owns:

- synchronous run admission and input snapshotting;
- caller-known run, session, and turn identity;
- message/context state for the request;
- one text-only model invocation;
- event validation and publication;
- steering and cancellation lifecycle; and
- lightweight terminal tombstones.

Injected or external responsibilities include:

- model/provider behavior through `ModelAdapter`;
- event persistence through `EventStore`;
- policy decisions and side-effect authorization;
- concrete workspace and tool implementations;
- provider credentials;
- scheduling and UI; and
- production durable infrastructure.

`Tool` and `Workspace` are compatibility targets in M6. They are not wired into the model request or
executed by `MinimalAgentRuntime`.

## Canonical event behavior

Successful order:

```text
turn.started
message.completed (user)
model.request
message.delta (assistant, sequence 0..n-1; zero or more)
model.response
message.completed (assistant)
turn.completed (completed)
```

The completed assistant message is replay truth. A completion-only model may emit no deltas.

New strict variants:

- `turn.started`;
- `message.delta`;
- `message.completed`;
- `steering.queued`;
- `context.compacted`; and
- `turn.completed`.

Existing `model.request`, `model.response`, `tool.call`, `policy.decision`, and `tool.result` remain
canonical. The envelope remains version one.

`context.compacted` is a schema contract only. M6 does not implement compaction behavior.

## Append-before-yield and backpressure

Admission is eager but still append-first:

1. append and queue `turn.started`;
2. append and queue the completed user message;
3. wait for the user message to be consumed;
4. append and queue `model.request`; and
5. wait for `model.request` to be consumed before invoking the model.

After admission, consumer demand permits provider output. A `text.delta` maps to one canonical
`message.delta`. Provider `response.completed` is not persisted or yielded itself; it ends model
pulling and drives the separately persisted `model.response`, completed assistant message, and
`turn.completed` sequence. Every canonical runtime boundary awaits `EventStore.append()` and is
exposed only after that append succeeds; each consumer advance gates further work.

An append failure poisons the writer, triggers the forwarded `AbortSignal` and best-effort iterator
cleanup if the model has been invoked, wakes the consumer with `EventAppendError`, and prevents
later observable boundaries. A provider may ignore the signal.

This is an ordering contract over an injected store. It is not a production durability claim because
M6 adds no durable store implementation.

## Model compatibility

- Existing `Model.complete()` remains supported.
- New `ModelAdapter.stream()` emits only `text.delta` and `response.completed`.
- `CompleteModelAdapter` emits one terminal response and does not fabricate provider deltas.
- Empty chunks are removed.
- Chunks larger than one MiB are split without changing concatenated text.
- Completed text is capped at 16 MiB.
- M6 accepts only successful text with no tool calls and `finishReason: "stop"`.

## Steering and cancellation

- `run()` registers identity and snapshots caller-owned input before returning the iterable.
- Steering linearized before the sole model boundary is appended before `steer()` resolves and joins
  that request.
- Steering after the boundary is rejected with `SteeringClosedError`.
- Active cancellation coalesces.
- Repeated cancellation of an already canceled run is a no-op.
- Iterator `return()` or `throw()` is abandonment and still attempts to persist cancellation.
- `AbortSignal` is forwarded to the model adapter with best-effort iterator cleanup.
- A failed canceled-terminal append rejects with `EventAppendError` and leaves a failed tombstone.
- Losing a JavaScript reference is not observable cancellation.

## Verification evidence

PR-head CI recorded:

```text
strict TypeScript                         passed
test files                               39 / 39
offline tests                            568 / 568
golden scenarios                          1 / 1
allowed paths before tests               15
allowed paths after tests                15
path-policy violations                    0
run-report/v2                            passed
PR-head automated checks                  4 / 4 green
```

The diff adds 33 focused cases:

- 15 minimal-runtime tests;
- six event-schema tests;
- seven streaming fake-model tests;
- four completion-adapter tests; and
- one delta-normalization test.

The report's `tests.durationMs` is `17377`. It is whole-suite command timing, not a runtime benchmark,
load test, throughput result, latency distribution, capacity result, or performance improvement.

### Evidence-artifact boundary

Artifact `gate-evidence-33449593023`:

- attests PR head `6de0fd7`, not merge `98924a6`;
- expires on November 29, 2026;
- is uploaded CI evidence, not committed permanent evidence;
- contains a `run-report/v2` JSON with seven serialized events and `reportWritten: true`; and
- contains a SQLite file with five persisted events and a session still marked active.

The final `task.updated: delivered` and `run.recorded` events are in the JSON report but not the
SQLite file. Do not call the SQLite file a closed terminal session log.

Post-merge CI and CodeQL separately passed on exact merge `98924a6`.

## Article implementation

### New files

- `src/content/build-notes/HarnessRuntimeContracts.tsx`;
- `src/components/build-notes/HarnessRuntimeContractsDiagrams.tsx`; and
- `docs/29-harness-runtime-contracts-m6-build-note.md`.

### Updated files

- `src/lib/build-notes.ts` — Build Note 013 manifest metadata and section navigation;
- `src/app/(frontend)/build-notes/[slug]/page.tsx` — article import and slug mapping;
- `tests/unit/build-notes.test.tsx` — metadata, pin, claim, diagram, and code-block assertions;
- `tests/e2e/frontend.e2e.spec.ts` — route smoke and focused browser acceptance; and
- `docs/README.md` — documentation index and production record.

The generic Build Note route automatically supplies canonical metadata, BlogPosting and breadcrumb
structured data, analytics, footer source links, RSS, sitemap discovery, and static path generation.
No article-specific client JavaScript or stylesheet change is required.

## Diagram plan

1. **Kernel boundary:** runtime-owned admission, message state, one model request, and lifecycle;
   injected model/event ports; external policy, tools, workspace, credentials, and persistence.
2. **Append before yield:** consumer pull, model event, canonical validation, durable append, yield,
   and the failure path that aborts before later visibility.
3. **Lifecycle:** early steering, typed late rejection, coalesced cancellation, abandonment, and
   terminal tombstones.
4. **Compatibility roadmap:** old and new model/runtime paths coexist; M6 complete; M7–M12 planned.

All four use the existing no-JavaScript Harness diagram system and include `role="img"`, complete
`aria-label` descriptions, scrollable keyboard-accessible frames, and visible captions.

## Claim controls

Required article callouts:

- `M6 IS A CONTRACT LAYER, NOT A SELF-HOSTED AGENT`;
- `APPEND BEFORE YIELD`;
- `ONE TEXT-ONLY REQUEST, ZERO TOOL EXECUTION`;
- `CHECKS-GATED, NOT PEER-REVIEWED`; and
- `THE 17.377-SECOND CI FIELD IS NOT A BENCHMARK`.

Do not claim that M6:

- replaced `runAgent()`;
- executes tools or policy decisions;
- exposes a workspace directly to a model;
- implements compaction, replay, restart, or a production database;
- tested a live provider;
- guarantees a remote provider honors cancellation;
- implements budgets, timeouts, MCP, browser, GitHub, deployment, secrets, or subagents;
- demonstrates performance or production capacity; or
- received approving peer review.

## Verification and publication plan

1. Format the eight M6 files only.
2. Run focused Build Note unit tests and TypeScript checks.
3. Run lint and the fixture Static Site build.
4. Run focused browser acceptance at desktop and narrow mobile widths.
5. Inspect diagrams for clipping, focusability, readable labels, and no layout shift.
6. Verify the exported route, canonical URL, structured data, RSS, and sitemap.
7. Stage and commit only the eight M6 paths; preserve unrelated Gift Draft and Render work.
8. Push the website commit and wait for GitHub CI and CodeQL.
9. Wait for the checks-gated Render Static Site deployment.
10. Run custom-domain acceptance for article content, source pin, navigation, structured data,
    caching, security headers, sitemap, feed, and responsive overflow.
11. Add the final website commit, workflow IDs, Render deployment ID, generated-page count, and live
    acceptance result to this document in a docs-only follow-up.

## Production record

Pending publication. Record after the checks-gated Render deployment:

- website implementation commit;
- GitHub CI and CodeQL workflow IDs;
- Render deployment ID;
- generated-page and Build Note counts;
- production article URL;
- custom-domain acceptance result; and
- docs-only production-record commit.
