# Harness Platform M8 workspace-capability-boundary build note

## Purpose

Build Note 015 documents Harness Platform Stage 1, Milestone 8 at exact public merge
`d14fc13e299a6718d9e8a98ba9e028b320cd5f53`.

M8 turns workspace access from an assumed host privilege into an explicit injected capability. It
adds:

- one canonical operational `Workspace` contract in `packages/workspace`;
- strict, typed request and result normalization for seven workspace operations;
- method snapshotting and single-operation least-privilege views;
- workspace injection through both the minimal runtime and legacy `runAgent()` path;
- reviewed tool-boundary metadata that controls advertisement and execution;
- durable policy and permission checks before a workspace-backed tool can execute;
- fail-closed Agent Server admission while no operational service adapter exists; and
- an offline TypeScript-AST guard against direct filesystem and child-process imports in kernel and
  model-facing tool source.

It does **not** add `LocalWorkspace`, `DockerWorkspace`, operating-system isolation, path/link/race
confinement, the five final model-facing development tools, a live provider run, or a production
workspace benchmark. Those boundaries remain assigned to M9–M11 and later milestones.

## Source authority

| Source                   | Pin or identity                                            | What it supports                                                              |
| ------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Harness Platform merge   | `d14fc13e299a6718d9e8a98ba9e028b320cd5f53`                 | Exact public M8 source and exact-merge workflows                              |
| M8 base                  | `9e535b696a742a8aea4b6f1e15a377f3d19a6672`                 | Authoritative diff base and pre-M8 roadmap state                              |
| Initial implementation   | `b6ce9773f8ee228f360e74aef5506ca8096f8689`                 | Main implementation and initial failed CI                                     |
| Node 22 follow-up        | `fa8da7f95d4d25e121ff709349c420b7206ec626`                 | Native `AbortSignal` brand-check correction and final PR-head tree            |
| Pull request             | `#9 — M8: enforce workspace capability boundary`           | 19-file diff, two-commit chronology, checks, and automated review             |
| Final-head CI            | `33645737911`                                              | 658 tests, strict types, golden eval, 19-path gate, and retained artifact     |
| Final-head CodeQL        | `33645731987`; differential check `100300079671`           | Successful analysis; no new alerts in changed code                            |
| Exact-merge CI           | `33646021258`                                              | Successful push workflow on `d14fc13`                                         |
| Exact-merge CodeQL       | `33646020469`                                              | Successful push analysis on `d14fc13`                                         |
| Evidence artifact        | `gate-evidence-33645737911`, artifact `9852721940`         | Retained PR-head JSON and SQLite evidence; retention-bound                    |
| Task contract            | `tasks/m8-workspace-capability-boundary.yaml`              | Scope, acceptance criteria, permissions, authoring budget, and PR delivery    |
| Development conversation | Reviewed, intentionally not linked from the public article | Chronology and design intent only                                             |
| Publication audit        | Unretained clean checkout of exact merge                   | Independent reproduction of tests, strict TypeScript, and the golden scenario |

Public technical claims follow the pinned merge, task manifest, tests, pull request, and public
workflow evidence. The shared conversation explains why decisions were made, but it is not used as
the implementation source of truth.

## Release boundary

Relative to `9e535b6`, PR #9 changed exactly 19 files:

```text
ARCHITECTURE.md                                      +37 / -4
README.md                                             +6 / -5
ROADMAP.md                                           +24 / -16
packages/kernel/package.json                          +1
packages/kernel/src/run.ts                           +51 / -6
packages/kernel/src/runtime.ts                       +73 / -55
packages/kernel/test/run-agent.test.ts              +173 / -2
packages/kernel/test/runtime.test.ts                +360
packages/tools/package.json                           +1
packages/tools/src/fs-tools.ts                       +42 / -224
packages/tools/src/tool.ts                          +120 / -3
packages/tools/test/fs-tools.test.ts                +138 / -114
packages/workspace/src/index.ts                     +840 / -7
packages/workspace/test/import-boundary.test.ts     +196
packages/workspace/test/workspace.test.ts           +443
pnpm-lock.yaml                                        +6
services/agent-server/src/connection.ts               +7 / -9
services/agent-server/test/agent-server.test.ts       +47 / -1
tasks/m8-workspace-capability-boundary.yaml           +77

19 files changed · 2,642 insertions · 446 deletions
```

The feature branch contains two commits. `b6ce977` established the capability boundary;
`fa8da7f` made the `AbortSignal` validation compatible with Node 22 after the first CI run exposed a
brand-checking edge. The final PR-head tree and merge tree are identical.

## Canonical contract

The operational `Workspace` owns seven methods:

```ts
interface Workspace {
  readFile(path: string): Promise<string>
  writeFile(path: string, contents: string): Promise<void>
  listFiles(path: string): Promise<string[]>
  execute(request: {
    argv: readonly [string, ...string[]]
    cwd?: string
    timeoutMs?: number
    signal?: AbortSignal
  }): Promise<CommandResult>
  diff(): Promise<string>
  snapshot(): Promise<WorkspaceSnapshot>
  dispose(): Promise<void>
}
```

The existing `openWorkspace(root)` object remains a lexical `WorkspacePathScope`: it resolves and
checks paths but performs no I/O or process execution. M8 keeps that helper separate so a path
resolver cannot be mistaken for operational authority.

The command contract is argv-only. This removes a shell string from the interface, but M8 still has
no process adapter, container, resource policy, or proof that arbitrary commands are isolated.

## Strict dispatch and frozen authority

`invokeWorkspaceOperation()` accepts an unknown value at its public boundary. Before calling an
adapter it:

1. reads own data descriptors rather than invoking getters;
2. rejects accessors, symbols, unexpected keys, malformed arrays, and unknown operations;
3. normalizes paths, contents, argv, cwd, timeout, and a native `AbortSignal`;
4. invokes a previously bound method; and
5. normalizes the result into bounded ordinary data.

The dispatcher returns typed `required`, `malformed`, `unknown`, and `unsupported` errors. Arrays
are capped at 100,000 items, argv must contain a nonempty program, numbers must be finite safe
integers where required, and snapshot JSON rejects accessors, cycles, symbols, exotic prototypes,
non-finite values, and excessive depth.

`bindWorkspace()` reflects each of the seven methods once, binds it to the original adapter, and
freezes the wrapper. Replacing a method on the source object later cannot redirect the accepted
capability. The wrapper still shares the adapter's internal state; it is not a deep clone, and the
caller remains responsible for disposal.

`restrictWorkspace(workspace, capability)` creates a frozen one-operation view. The named method
delegates through the strict dispatcher; all six other methods reject with
`WORKSPACE_OPERATION_UNSUPPORTED` without consulting the underlying adapter.

## Runtime and tool admission

`MinimalAgentRuntime` accepts an optional operational workspace through `RunInput.workspace` and
snapshots it once. The model never receives that object in its context. A workspace-backed tool is
advertised only when a capability was injected; pure tools and sandbox tools receive no workspace
object.

Before a workspace effect the runtime preserves M7's ordering fence:

```text
durable tool.call
→ validate the registered tool and detached arguments
→ require a reviewed workspace boundary
→ require an injected Workspace
→ require an explicit PermissionController
→ durable policy.decision
→ optional durable permission.requested / permission.resolved
→ inject exactly one restricted Workspace operation
→ execute the tool
→ durable tool.result and tool observation
```

The legacy `runAgent()` retains `workspace?: string` as identity metadata and adds the independent
`workspaceCapability?: Workspace`. Keeping identity and authority separate avoids converting an
ordinary path string into executable privilege.

The Agent Server currently owns workspace identity metadata but no operational adapter. It rejects
workspace-bound tools during session admission instead of advertising a tool that could bypass
policy or fail only after the model selects it. M9 owns explicit adapter and lifecycle wiring.

## Model-facing scope at M8

The interface contains read, write, execute, snapshot, diff, and disposal capabilities, but the M8
reviewed tool boundary admits only the read subset: `readFile`, `listFiles`, `diff`, and `snapshot`.
It does not create the M11 names `fs.read`, `fs.list`, `fs.write`, `process.exec`, or `git.diff`.

The compatibility `read_file` tool now uses only the injected workspace dispatcher and enforces a
128 KiB UTF-8 result limit. Its `root` field is reviewed metadata—not an enforced path boundary.
At this milestone any nonempty path, including an absolute or traversal-shaped path, is forwarded
to the injected adapter. The future adapter must enforce root, link, race, and `allowed_paths`
safety.

## Source import guard

The new offline fixture parses source with the TypeScript AST. It scans production files in
`packages/kernel/src` and `packages/tools/src`, rejects source-tree symlinks, and detects direct
static imports, exports, import types, dynamic imports, and `require()` calls for:

- `node:fs` and `fs`;
- `node:fs/promises` and `fs/promises`; and
- `node:child_process` and `child_process`.

This is a repository architecture rule, not an operating-system sandbox. It does not prove that a
malicious dependency, computed module specifier, runtime evaluation, or an injected adapter cannot
touch the host. `packages/workspace` and trusted CLI/service outer adapters are intentionally
outside that particular gate.

## Machine-readable development gate

The M8 task restricts edits to the architecture/readme/roadmap, kernel, tools, workspace, Agent
Server, lockfile, and its own manifest. Network and Git push are denied. Test and typecheck commands
are allowlisted, and delivery is a pull request. Its `100000` model-token and `200` tool-call budget
governed the development agent; those values are not runtime workspace limits.

The retained successful report checks all 19 changed paths before and after tests and records zero
policy violations.

## Delivery chronology

1. PR #9 was created at `2026-09-02T14:56:25Z`.
2. Initial-head CI run `33645319615` passed 657 of 658 tests but failed the Node 22
   duck-typed/revoked-`AbortSignal` case.
3. Commit `fa8da7f` added a native intrinsic-getter brand check and composed an unshadowed signal.
4. Final-head CI `33645737911` and CodeQL `33645731987` completed successfully before merge.
5. The PR merged at `2026-09-02T15:02:58Z` as `d14fc13`.
6. Exact-merge CI `33646021258` and CodeQL `33646020469` subsequently passed.

Required wording: **green final-head checks preceded merge, then the exact merge was reverified**.
GitHub reports `main` as unprotected, so the publication must not claim branch protection required
those checks.

## Review caveats

No public human approval or review decision is visible. Copilot left a `COMMENTED` “changes
recommended” review on `b6ce977` with two relevant hardening suggestions:

- `read_file` forwards absolute and traversal-shaped paths to the adapter rather than rejecting
  them at the tool layer; and
- its Zod object is not `.strict()` even though its advertised JSON Schema uses
  `additionalProperties: false`.

The path thread remains unresolved and non-outdated. The schema finding is suppressed in the public
review UI. Neither changed in `fa8da7f` or the merge tree. They are reported as unresolved automated
review suggestions, not as confirmed exploits. The PR body's author-reported “independent
acceptance and security reviews” is not treated as public peer-review evidence.

## Verification

Final-head CI recorded:

- 658 of 658 tests across 42 files;
- strict TypeScript;
- one of one deterministic golden scenario;
- 19 changed paths checked before and after tests; and
- zero path-policy violations.

The successful retained artifact is `gate-evidence-33645737911`, artifact ID `9852721940`, digest
`sha256:353da9de5303c8196a217785652f411ad778c4aa4350796a5db03bbe2dd8f431`, expiring
December 1, 2026. It pins final feature head `fa8da7f` against base `9e535b6`; it is not merge-commit
evidence. Its report records 658 passing tests, 19 allowed paths, zero violations, and 18,609 ms.

The artifact JSON serializes seven events. The accompanying SQLite database contains five events
and leaves its session active with no `closed_at`. It must not be presented as a complete terminal
session log. The inline JSON in the PR body is a separate local run rather than the artifact JSON.

For publication, a fresh archive of exact merge `d14fc13` was installed in a clean temporary
directory. Under Node 24.18.0 it reproduced 658/658 tests, strict TypeScript, and 1/1 golden scenario.
The first sandboxed test attempt failed only because loopback listeners were denied; the same exact
checkout passed with loopback-only HTTP/WebSocket listeners enabled. This local record is
unretained and is labeled separately from public workflow evidence.

The CI report's 18.609-second test field and local suite duration are functional-test timings. They
are not load, throughput, latency, concurrency, memory, capacity, adapter, or production-performance
measurements.

## Publication implementation plan

1. Add the M8 metadata record at the front of the Git-authored Build Notes registry.
2. Add a server-rendered article pinned to `d14fc13`, with source links resolved at that commit.
3. Add four static, keyboard-scrollable, accessible diagrams for topology, strict dispatch,
   runtime/service admission, and source-import enforcement.
4. Add the article to the exhaustive slug-to-component route map.
5. Extend unit coverage for metadata, copy boundaries, diagrams, and code figures.
6. Extend the route smoke list and add a 390-pixel mobile acceptance test with overflow checks.
7. Run formatting, strict types, lint, unit tests, the static fixture build, and focused browser
   tests.
8. Publish through GitHub and the checks-gated Render Static Site, then verify the custom-domain
   article, metadata, structured data, RSS, sitemap, caching, security headers, and responsive
   diagrams.
9. Append the website commit, workflow, Render deploy, static-page count, and live acceptance only
   after those facts exist.

## Current truth

| Surface             | What M8 proves                                                                 | What remains open                                                        |
| ------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Authority           | Workspace access is an explicit injected object, never inferred from identity. | M8 ships no host-backed operational adapter.                             |
| Least privilege     | Each workspace tool receives one frozen operation view.                        | The trusted adapter still owns all internal state and enforcement.       |
| Policy              | Durable intent and authorization precede a workspace effect.                   | Exactly-once external effects and restart recovery are not provided.     |
| Paths               | Requests are structurally normalized before adapter invocation.                | Root, traversal, symlink, hard-link, race, and allowed-path safety wait. |
| Processes           | The canonical command shape is argv-only.                                      | No process runner, shell isolation, quotas, or Docker proof exists.      |
| Tools               | The compatibility `read_file` seam uses injected authority and bounded output. | Five canonical M11 development tools are not shipped.                    |
| Service             | Agent Server refuses workspace tools without an adapter.                       | Service adapter creation, selection, and disposal wait for M9.           |
| Source architecture | An AST fixture blocks listed direct host imports in kernel and tools.          | It is not a runtime sandbox or whole dependency-graph proof.             |
| Verification        | Public and independent lanes pass 658 tests, strict types, and one eval.       | No live filesystem/process adapter, provider, Docker, or load test ran.  |

## Files to inspect

- `packages/workspace/src/index.ts` — canonical contract, strict dispatcher, method binding,
  restricted views, and output normalization.
- `packages/workspace/test/workspace.test.ts` — malformed input, hostile objects, binding,
  least-privilege, output, and `AbortSignal` coverage.
- `packages/workspace/test/import-boundary.test.ts` — TypeScript-AST import enforcement and real
  source-tree scan.
- `packages/tools/src/tool.ts` — reviewed execution-boundary registry.
- `packages/tools/src/fs-tools.ts` — injected `read_file` compatibility seam and bounded output.
- `packages/kernel/src/runtime.ts` — capability-aware advertisement, permission requirement, and
  single-operation injection.
- `packages/kernel/src/run.ts` — separate legacy workspace identity and capability.
- `services/agent-server/src/connection.ts` — M8 fail-closed service admission.
- `tasks/m8-workspace-capability-boundary.yaml` — acceptance, scope, permissions, budget, and
  delivery contract.
- `ROADMAP.md` — exact M8 boundary and planned M9–M11 sequence.

## Roadmap boundary

- **M9:** explicit developer-only `LocalWorkspace`, with path/link/race, bounded-I/O,
  cancellation, diff, snapshot, and disposal conformance.
- **M10:** disposable `DockerWorkspace`, credential-free startup, network denial, resource bounds,
  artifact/patch export, and audited cleanup; it becomes the default native selector.
- **M11:** exactly five canonical model capabilities: `fs.read`, `fs.list`, `fs.write`,
  `process.exec`, and `git.diff`.
- **M12–M18:** steering, follow-ups, context compaction, durable replay, restart safety, offline
  native integration, authorship attestation, and live self-built proof.

## Claim controls

- Say “injected capability boundary,” not “secure filesystem sandbox.”
- Say “green final-head checks preceded merge,” not “branch-protection gated the merge.”
- Say “no new CodeQL alerts in changed code,” not “zero vulnerabilities.”
- Say “one-operation frozen view,” not “deeply cloned or stateless adapter.”
- Say “argv-only contract,” not “safe command execution.”
- Say “AST import fixture,” not “unbypassable host isolation.”
- Say “functional verification timing,” not “performance” or “load result.”
- Keep the unresolved automated-review suggestions visible.
- Keep the shared development conversation out of the public evidence ledger.

## Production evidence

The first publication landed in website commit
`049770cf58a99a246283a5176d8c9373aa23509b`. GitHub CI run `33650503109` passed
both TypeScript checks, ESLint, the full unit suite, the production build, and the reviewed-fixture
static export. CodeQL run `33650502476` passed both its Actions and JavaScript/TypeScript jobs.

The checks-gated Render Static Site deployed that exact commit as
`dep-dac4a8mq1p3s73a0dde0`. Render prepared public content revision `2e8da5a6f350` with five
prototypes, generated 34 of 34 static pages, and verified 15 Build Notes plus five prototype routes
before the deploy became live at `2026-09-02T15:48:40Z`.

Production acceptance on the custom domain verified:

- HTTP 200 for
  `https://saberistic.com/build-notes/harness-workspace-capability-boundary-m8/`;
- the expected title, H1, short commit `d14fc13`, canonical URL, BreadcrumbList, and BlogPosting
  structured data;
- four accessible diagram images, four labeled keyboard-scrollable diagram regions, and the
  keyboard-scrollable current-truth table;
- no document-width overflow at the 390-by-844 acceptance viewport;
- M8 as the newest entry on the Build Notes index and in `/build-notes/feed.xml`;
- the canonical M8 route in `sitemap.xml`;
- a Cloudflare CDN cache hit with a five-minute shared-cache window; and
- the deployed CSP, Permissions Policy, Referrer Policy, `X-Content-Type-Options`, and
  `X-Frame-Options` headers.

The focused production Playwright acceptance passed one of one tests. These website checks verify
publication, discoverability, and responsive behavior; they do not change the M8 runtime evidence
boundary or create host-adapter, provider, load, capacity, isolation, or production-security proof.

## Definition of done

- [x] Build Note 015 is registered first and pinned to full merge SHA `d14fc13…`.
- [x] Every table-of-contents label maps to an article section ID.
- [x] Four diagrams expose an image role and keyboard-scrollable region with meaningful labels.
- [x] Current-truth table is keyboard-scrollable and distinguishes proof from open work.
- [x] Unit, type, lint, static export, and focused mobile browser checks pass.
- [x] GitHub CI and CodeQL pass for the website commit.
- [x] Render publishes the checks-gated Static Site build.
- [x] The live custom-domain article, JSON-LD, feed, sitemap, caching, headers, and responsive layout
      pass acceptance.
- [x] This record is updated with final website and deployment evidence.
