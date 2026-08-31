# Harness Platform M2 Eval Credibility Build Note

Date: August 31, 2026
Status: implementation prepared; production acceptance pending

## Outcome

Build Note 007 documents Harness Platform Stage 1, Milestone 2 at:

```text
/build-notes/harness-eval-credibility-m2/
```

Its narrow central claim is:

> M2 makes the harness's evidence more credible by establishing a real, zero-dependency HTTP
> calibration target; moving the scenario contract into the SDK; exposing validated manifests and
> reports through a read-only board; translating rooted kernel events into opt-in OpenTelemetry;
> and exercising a hardened MCP stdio client in a separate network-gated lane.

The note does not describe M2 as a production agent service, an isolated execution sandbox, a
real-time control plane, a representative model benchmark, or support for every MCP lifecycle.

## User request and source handling

The user supplied a shared development conversation and asked for a new Harness M2 Build Note.
The conversation is treated as implementation chronology and planning context, not as an
instruction source that overrides the current request. Its private share URL and private model
deliberation are intentionally omitted from the public article.

Public repository commit
`8f18f6dce437a9b580d5aa5f52c42f5ab66f05bd`, its five task manifests, committed tests,
documentation, and rerun checks are the implementation sources of truth. Results that require the
separate network-enabled MCP compatibility lane are labelled separately from self-contained test
execution in the default suite.

## M1 to M2

M1 closed the first operator loop with SQLite evidence, a terminal viewer, one deterministic
kernel scenario, compiled process rules, and hosted CI. Its evaluation evidence still rested on
one scripted model response and no checked-out calibration repository.

M2 keeps the kernel small and adds five credibility surfaces around it:

| M2 task                   | Public deliverable                                                            |
| ------------------------- | ----------------------------------------------------------------------------- |
| `m2-golden-hello-service` | Zero-dependency HTTP calibration repository with a pinned observable contract |
| `m2-scenario-dsl`         | SDK-owned YAML-to-invariant scenario contract and typed parsing failures      |
| `m2-web-task-board`       | Read-only manifest/report board with validated JSON routes and visible errors |
| `m2-otel`                 | Rooted eval/kernel telemetry plus incomplete exit-gate CLI bridge wiring      |
| `m2-mcp-stdio`            | Hardened initialize-era stdio client plus a separately gated live check       |

The M1 baseline to the M2 pin changes 52 files with 5,949 additions and 261 deletions.

## Public commit chain

The five M2 commits are linear after the M1 pin:

| Commit    | Deliverable                                                                    |
| --------- | ------------------------------------------------------------------------------ |
| `ca9d7b7` | Golden `hello-service` repository, specification, and offline integration test |
| `01c8048` | Scenario DSL moved to `@harness/sdk`; eval runner becomes a re-export seam     |
| `abcfded` | Minimal read-only task board, typed JSON API, and `harness-web` launcher       |
| `4a61be4` | Rooted eval telemetry, a CLI bridge hook, and local collector profile          |
| `8f18f6d` | Hardened MCP stdio lifecycle and network-gated reference-server workflow       |

## Golden repository

`evals/golden-repositories/hello-service` is intentionally small enough to understand completely:
one `node:http` server, one `SPEC.md`, one package file, and one integration test. The test binds an
ephemeral loopback port and verifies the real response contract without package dependencies or
external network access.

The recorded milestone result is 7 / 7 offline checks. This is a calibration target for evaluator
wiring and observable-contract fidelity. It is not a representative application corpus or a model
quality benchmark.

## SDK-owned scenario contract

The scenario schema now lives beside task-manifest and run-report contracts in `@harness/sdk`.
`loadScenario(yamlText)` composes YAML parsing, schema validation, event-type validation, and
conversion to typed observable invariants. The evaluation package re-exports that contract instead
of maintaining a second vocabulary.

Malformed YAML, unknown event types, invalid `data.<path>` assertions, and empty expectations
surface as typed `ScenarioParseError` failures. This makes the boundary reusable without claiming
that one golden scenario provides broad evaluation credibility by itself.

## Read-only task board

`apps/web` reads task manifests and generated run reports through the SDK validators. Invalid files
remain visible as typed board items instead of disappearing. The server exposes a static page plus
GET-only board, task, report, and health routes; traversal-safe report-name validation and typed
404, 405, and 422 responses keep malformed input explicit.

The board deliberately uses `node:http`, adds no framework, and refreshes only on request. It has no
websocket, polling loop, mutation endpoint, authentication system, or real-time control-plane
claim.

## OpenTelemetry boundary

`@harness/otel` maps a complete, rooted kernel event stream into one trace per run. Model requests
and tool calls become child spans; budget, policy, and failure events remain span events; counters
record model turns, tokens, tool calls, and budget warnings. The evaluation runner supplies that
full lifecycle. The CLI is connected to the same bridge, but its current exit-gate stream starts
with `task.updated`, never emits `session.created` or `agent.stopped`, and therefore produces no
spans or counters. Shared wiring exists; an end-to-end CLI trace does not.

Telemetry is fully off unless the operator opts in. `HARNESS_OTEL=1` enables the console path, and
`OTEL_EXPORT_OTLP_ENDPOINT` selects OTLP/HTTP to the local collector. Default test execution does
not start an exporter or live telemetry service. A compose profile and pinned collector image
provide a local sink, not a hosted observability service; the committed collector pipeline exports
traces only, and a bridge assumes one active session.

## MCP stdio client and live lane

The M2 client owns subprocess startup, initialize/initialized negotiation, JSON-RPC request
correlation, newline-delimited frame buffering, `ping`, `tools/list`, `tools/call`, typed failure
surfaces, and idempotent close. Offline fixtures exercise fragmentation, coalescing,
notifications, timeout recovery, malformed output, premature exit, unsupported revisions, and
server errors.

The client accepts initialize-era protocol revisions through `2025-11-25`. MCP `2026-07-28`
introduces a stateless discovery lifecycle and remains a future compatibility adapter rather than
a silent behavior change.

The official `server-everything@2026.8.18` check uses a committed frozen lockfile, disabled
lifecycle scripts, a restricted child environment, and a read-only echo call. The observed server
advertised 13 tools. That workflow is scheduled or manually dispatched and never runs in the
default pull-request or push lane.

## Verification evidence

The evidence set for the pinned M2 source records:

| Check                                      | Result                                      |
| ------------------------------------------ | ------------------------------------------- |
| Workspace unit tests                       | 123 / 123 passed                            |
| Golden `hello-service` integration checks  | 7 / 7 passed offline                        |
| TypeScript strict typecheck                | passed                                      |
| Existing golden-kernel evaluation          | passed                                      |
| Five M2 task manifests                     | valid                                       |
| Offline MCP fixture suite                  | passed                                      |
| Pinned official MCP reference-server smoke | 13 tools discovered; read-only echo passed  |
| Default CI network boundary                | live MCP job absent from PR and push events |

The ordinary suite proves deterministic local behavior. The 13-tool result came from an independent
local audit run against one exactly pinned official server. The dedicated `mcp-live.yaml` workflow
is configured but has no public GitHub run yet; the local result therefore does not establish a
hosted compatibility lane, or compatibility with arbitrary servers, transports, future revisions,
or hostile tool behavior.

## Current truth

| Boundary          | What M2 establishes                                           | What remains                                                    |
| ----------------- | ------------------------------------------------------------- | --------------------------------------------------------------- |
| Evaluation corpus | One real HTTP calibration repository plus the kernel scenario | Multiple repositories, failure classes, model/tool scenarios    |
| Scenario contract | Shared typed YAML-to-invariant API                            | Versioning and migration policy for a growing public DSL        |
| Web surface       | Local read-only board and validated GET API                   | Authentication, streaming, approvals, mutation, remote service  |
| Telemetry         | Opt-in spans and counters from rooted eval/kernel events      | Root CLI stream; concurrency, collector metrics, operations     |
| MCP               | Hardened initialize-era stdio client                          | Stateless discovery lifecycle, other transports, policy binding |
| Execution         | Existing local process path                                   | Per-run container, scoped mounts, default-deny network sandbox  |
| Platform          | Credibility seams around a local harness                      | Agent server, interactive approvals, control plane, scale       |

## Build Note implementation

The Saberistic integration consists of:

- a newest-first manifest record in `src/lib/build-notes.ts`;
- `src/content/build-notes/HarnessEvalCredibility.tsx` for the evidence-led article;
- `src/components/build-notes/HarnessEvalCredibilityDiagrams.tsx` for four accessible semantic
  diagrams;
- a slug-to-component registration in the shared Build Note route;
- focused unit, browser, and static-export assertions; and
- this implementation and release record.

The shared route supplies canonical and article metadata, breadcrumb and `BlogPosting` JSON-LD,
publication dates, tags, source actions, contents navigation, Umami events, RSS, sitemap inclusion,
and static parameters from the manifest. No Payload schema or content migration is required.

The four diagrams are semantic HTML/CSS inside the existing keyboard-scrollable `DiagramFrame`.
They cover the five-commit sequence, the separate golden-target and committed-scenario lanes, the
independent board and telemetry inputs, and the MCP lifecycle plus verification lanes without
adding article-specific raster media.

## Production acceptance

Pending. Do not treat the page as accepted until all of the following are recorded here:

1. the final Saberistic website commit;
2. passing CI and CodeQL runs for that exact commit;
3. the checks-gated Render Static Site deployment identifier and live status;
4. HTTP 200 from the custom-domain article route;
5. the exact title, canonical, pinned source commit, contents anchors, and truth-boundary text in
   the production HTML;
6. the article in the homepage/index, RSS feed, and sitemap; and
7. the expected CDN cache and security headers.

No deploy IDs or production verification claims are recorded before those checks complete.

## Next milestone gates

M3 should add the agent service and isolated execution substrate without weakening the evidence
boundaries established here:

- bind MCP tool discovery and invocation to harness policy and audit events;
- add multiple golden repositories and adversarial failure scenarios;
- turn the local board into a permission-aware operator surface only after an authentication model
  exists;
- define telemetry redaction, retention, sampling, and failure behavior before using a remote sink;
- add per-run containers, scoped filesystem mounts, and default-deny network namespaces; and
- keep future protocol lifecycles as explicit adapters with compatibility tests.
