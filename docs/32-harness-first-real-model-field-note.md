# Harness first real-model field note

## Purpose

Build Note 016 documents the first local Harness Platform sessions that reached a real model and
then completed a policy-governed, read-only repository inspection. The experiment ran on
September 2, 2026 from branch `tasks/ollama-repo-summary`, whose `HEAD`, merge base, and public base
were all the M8 merge:

```text
d14fc13e299a6718d9e8a98ba9e028b320cd5f53
```

This is a **field note from an uncommitted local worktree**. It is not M9, a Harness release, a
merged feature, a reviewed pull request, or GitHub-CI verification of the local changes. M8 remains
the latest public Harness release. The note exists because a real provider exposed integration
failures that deterministic fixtures had not exposed:

- the OpenAI-compatible adapter's guarded argument arrays were rejected at the kernel boundary;
- the default 60-second provider deadline was too short for the selected local model;
- the model improvised command shapes that the task policy correctly denied;
- the first 12,000-token budget was too small for one exploratory run; and
- an ignored Agent Server SQLite file was still detected as an out-of-scope workspace change.

The resulting local corrections and successful sessions are useful engineering evidence. They do
not inherit the release status or public workflow evidence of M8.

## Evidence hierarchy

| Level | Evidence                          | Identity                                                                               | What it supports                                                                                                       |
| ----- | --------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1     | Public M8 merge                   | `d14fc13e299a6718d9e8a98ba9e028b320cd5f53`                                             | Committed source on which the field test was based                                                                     |
| 1     | Public M8 PR and workflows        | PR `#9`; CI `33646021258`; CodeQL `33646020469`                                        | M8 release evidence only, not the local experiment                                                                     |
| 2     | Local Agent Server event database | Temporary SQLite store outside the worktree                                            | Session chronology, model label, requests, tool calls, policy decisions, sandbox lifecycle, usage, and terminal status |
| 2     | Local gate reports                | `run-c705bf61-2076-40de-9370-a5d393ae144b`; `run-8bc98c57-3312-4d63-b60d-7b20351bc918` | The blocked scope check and subsequent 669-test local gate                                                             |
| 3     | Local working-tree diff           | Six modified tracked files plus one untracked task manifest                            | Exact code and task contract under test; mutable and not publicly addressable                                          |
| 3     | Running process inspection        | Node 24.18.0 process and allowlisted non-secret environment selectors                  | Exact later server command, model endpoint, timeout, and sandbox tag                                                   |
| 4     | Shared development conversation   | Reviewed; not a public implementation authority                                        | Operator intent, prompt text, terminal presentation, and the final answer returned over ACP                            |

Public source: [Harness Platform at `d14fc13`](https://github.com/saberistic-team/harness-platform/tree/d14fc13e299a6718d9e8a98ba9e028b320cd5f53).
Public delivery context: [M8 PR #9](https://github.com/saberistic-team/harness-platform/pull/9).

The event store deliberately does not persist ACP prompt content or `finalText`. It can prove that
a model response stopped successfully after repository-reading tools, but not that the final answer
contained exactly five bullets or that each sentence was correct. Those content claims require the
shared transcript and manual comparison with the files read by the model.

## Experiment boundary

The run exercised the M8 repository's existing service path:

```text
terminal ACP client
  -> Agent Server WebSocket session
  -> legacy runAgent multi-round loop
  -> OpenAI-compatible model adapter
  -> loopback Ollama endpoint
  -> qwen3.8:27b-mlx
  -> structured sandbox_exec request
  -> kernel argument normalization
  -> manifest policy decision
  -> Docker sandbox with read-only repository access
  -> bounded tool observation
  -> model's final ACP response
```

The Agent Server uses the legacy `runAgent()` seam. `sandbox_exec` is a separately reviewed
sandbox tool that the service conditionally registers when sandbox configuration and a task
manifest are present. The manifest does not itself declare a tool list.

This run did **not** exercise an M9 `LocalWorkspace`, an M10 `DockerWorkspace`, or an operational
M8 `Workspace` adapter. M8 still rejects workspace-bound tools in Agent Server when no operational
adapter is injected. The field test therefore proves a real model can use the existing Docker
sandbox tool; it does not close the M9 or M10 roadmap milestones.

## Exact local configuration

The later Agent Server process began at `2026-09-02T11:25:28-04:00` under Node `24.18.0`:

```bash
node --import tsx services/agent-server/src/cli.ts --root . --port 8765
```

Its non-secret Harness selectors were:

```text
HARNESS_MODEL_ID=qwen3.8:27b-mlx
HARNESS_MODEL_BASE_URL=http://127.0.0.1:11434/v1
HARNESS_MODEL_TIMEOUT_MS=180000
HARNESS_SANDBOX_IMAGE=harness-sandbox:local
HARNESS_SANDBOX_TRUST_LOCAL_IMAGE=true
```

The provider endpoint was loopback HTTP. The Docker sandbox itself recorded `network: none`.
Those are distinct boundaries: “sandbox network disabled” must not be rewritten as “the whole
host performed no networking.”

The image reference is a mutable local tag accepted through an explicit development trust flag. No
digest in the event record proves which image bytes ran. The experiment is therefore not an
image-reproducibility or supply-chain attestation. It also used Node 24.18.0 locally while the
repository and public CI target Node 22.

## Local working-tree delta

The branch still pointed at `d14fc13`. Relative to that commit, the uncommitted tree contained 137
insertions and one deletion across six tracked files, plus the 58-line untracked task manifest:

```text
README.md
packages/kernel/src/run.ts
packages/kernel/test/run-agent.test.ts
services/agent-server/src/cli.ts
services/agent-server/src/config.ts
services/agent-server/test/config.test.ts
tasks/ollama-repo-summary.yaml
```

The kernel change accepts one adapter-specific array shape: an own, non-enumerable `toJSON` data
property whose value is exactly `undefined`. It still rejects accessors, enumerable named array
properties, executable `toJSON` values, symbols, exotic objects, cycles, excess depth, excess node
counts, and excess serialized bytes. Owned clone arrays receive a temporary inert serialization
guard, which is removed before the normalized value crosses the next package boundary.

The service change parses `HARNESS_MODEL_TIMEOUT_MS` only as a positive decimal integer without
whitespace, caps it at `2,147,483,647`, and accepts it only when both provider selectors are
configured. Omitting it retains the adapter's strict 60,000-millisecond default.

The new local tests contribute eleven cases to the suite:

- one guarded-array pass-through case;
- one test that checks both executable and enumerable `toJSON` rejection paths;
- one explicit 180,000-millisecond forwarding case;
- seven invalid timeout values; and
- one timeout-without-provider rejection case.

## Task contract

`tasks/ollama-repo-summary.yaml` asks the real model to inspect the repository and return exactly
five concise architecture bullets grounded in files it reads. The current local version validates
and sets:

```yaml
permissions:
  fs.read: allow
  fs.write: deny
  process.exec:
    'pwd': allow
    'ls**': allow
    'find**': allow
    'cat**': allow
    'head**': allow
    'sed**': allow
    'wc**': allow
    'git status**': allow
    'git log**': allow
    'git diff**': allow
    '*': deny
  network: deny
  git.push: deny

budget:
  max_model_tokens: 30000
  max_tool_calls: 30

delivery:
  type: pull_request
```

`fs.read: allow` gives the container a recursive read-only bind of the repository. The seven
`allowed_paths` are the permitted change scope and candidate write-mount set; they do not narrow
read visibility. Because `fs.write` is denied, the observed `sandbox.started` events correctly
record zero **writable** mounts. They do not mean the read-only repository bind was absent.

## Exact chronology

Times below are EDT with UTC in parentheses.

### Provider connectivity smoke

Three taskless sessions first established that an OpenAI-compatible response could travel from
local Ollama through Agent Server and return successfully:

| Session          | Window                                   | Elapsed  | Steps / tools | Tokens | Result    |
| ---------------- | ---------------------------------------- | -------- | ------------- | ------ | --------- |
| `sess-597eff47…` | 11:05:39–11:06:20 (`15:05:39–15:06:20Z`) | 40.864 s | 1 / 0         | 71     | completed |
| `sess-a025b976…` | 11:07:09–11:07:14 (`15:07:09–15:07:14Z`) | 5.218 s  | 1 / 0         | 232    | completed |
| `sess-fcf0fdc0…` | 11:08:11–11:08:17 (`15:08:11–15:08:17Z`) | 5.407 s  | 1 / 0         | 274    | completed |

These prove provider connectivity and text completion only. They had no `task_id`, made no tool
call, and carry no recorded 12,000- or 30,000-token task budget.

### Task-bound model sessions

| Session          | Window            | Elapsed   | Steps / calls | Tokens | Terminal status                      |
| ---------------- | ----------------- | --------- | ------------- | ------ | ------------------------------------ |
| `sess-8f56ea38…` | 11:12:51–11:13:10 | 18.715 s  | 1 / 0         | 499    | failed: invalid model tool arguments |
| `sess-23e9e652…` | 11:16:30–11:17:30 | 60.011 s  | 1 / 0         | 0      | failed: model timeout                |
| `sess-3b80f78c…` | 11:17:51–11:18:51 | 60.009 s  | 1 / 0         | 0      | failed: model timeout                |
| `sess-fce65e06…` | 11:20:42–11:22:34 | 111.174 s | 3 / 3         | 9,781  | completed                            |
| `sess-c197dcfd…` | 11:25:56–11:27:32 | 96.405 s  | 6 / 17        | 19,932 | budget exceeded at 12,000            |
| `sess-5a8b3a7c…` | 11:30:00–11:34:53 | 292.827 s | 3 / 4         | 14,162 | completed                            |
| `sess-7f66c7b5…` | 11:35:37–11:37:01 | 84.329 s  | 3 / 4         | 18,014 | completed                            |

The first task-bound attempt reached a `tool_calls` finish with 334 prompt tokens and 165
completion tokens. Before `tool.call` could be recorded, the kernel rejected the adapter's guarded
argv array as unbounded JSON and stopped with `MODEL_INVALID_RESPONSE`. The local kernel regression
change was written immediately afterward.

The next two sessions stopped after 60.003 seconds of request time with `MODEL_TIMEOUT`. The local
service added the validated timeout selector. In a later completed session, three provider calls
took 66.087, 129.668, and 95.617 seconds, directly demonstrating that the configured 180-second
deadline allowed responses that the default would have rejected.

### First completed task-bound tool loop

`sess-fce65e06…` made three accepted calls:

```text
sed -n 1,180p README.md
sed -n 1,200p ARCHITECTURE.md
ls -la packages
```

All three Docker executions completed with exit code zero, no truncated output, network disabled,
zero writable mounts, and successful cleanup. The run consumed 8,965 prompt tokens and 816
completion tokens. A warning recorded 9,781 of the then-12,000-token limit, or 82 percent.

This is the first durable evidence of a completed task-bound real-model repository-reading loop.
The exact five-bullet answer must still be verified from the ACP client transcript because it is not
stored in the event database.

### Policy held against model improvisation

`sess-c197dcfd…` requested seventeen tool calls. Eleven were admitted and completed in Docker. Six
were denied before sandbox execution:

```text
sh -c 'ls -la'
sh -c 'find ... 2>/dev/null | head -40'
ls -la apps/
ls -la packages/
ls -la services/
ls -la infra/
```

The two shell-wrapped requests were outside the argv-pattern allowlist. The four slash-suffixed
forms also failed to match the configured command patterns. Each returned
`TOOL_POLICY_DENIED`; none created a sandbox lifecycle event. The model eventually returned a
`stop` response, but cumulative use reached 19,932 tokens against the 12,000-token hard budget, so
the run's terminal status was `budget_exceeded`.

This is evidence that policy rejected these six concrete requests. It is not proof that every
possible unsafe command or hostile workload is contained.

### Final chronological completed session

After the task budget rose to 30,000 tokens, `sess-7f66c7b5…` completed in three model steps. It
used four direct-argv calls:

```text
cat README.md
cat ARCHITECTURE.md
ls -la
ls packages services apps
```

All four tool results were successful. Four containers completed with exit code zero, `network:
none`, zero writable mounts, no output truncation, and `cleanup: removed`. Model-request latencies
were 20.485, 46.665, and 16.241 seconds. Total usage was 17,336 prompt tokens plus 678 completion
tokens, or 18,014 of 30,000. The terminal event recorded `completed` after 84.329 seconds.

## Sandbox and policy evidence

Across the four sessions that emitted normalized tool calls, the event database contains:

- 28 `tool.call` events;
- 22 admitted Docker executions;
- six policy-denied calls with no Docker execution;
- 22 `fs.read: allow` decisions;
- 154 `fs.write: deny` decisions, one for each of seven allowed-path candidates per admitted run;
- 22 `network: deny` decisions;
- 22 completed sandbox-stop events with exit code zero;
- 22 removed-container results; and
- zero truncated tool outputs.

Every admitted execution also records authorization at both the kernel tool boundary and the
sandbox runner boundary. The Docker plan at the M8 source base uses a read-only root filesystem,
recursive read-only workspace bind, `--network none`, all-capability drop, no-new-privileges,
non-root host-owner identity, a 128-process limit, 512 MiB memory limit, one CPU, and a 64 MiB
`noexec,nosuid,nodev` temporary filesystem. The model-facing tool caps returned output at 64 KiB.

Those source controls and lifecycle events support a description of this observed run. They do not
constitute a container-escape assessment, hostile-image test, kernel-isolation proof, or production
security certification.

## Local gate evidence

The first gate attempt, `run-c705bf61-2076-40de-9370-a5d393ae144b`, stopped before tests with:

```text
PATH_SCOPE_VIOLATION: changes are outside allowed_paths before tests
```

The violating path was the ignored runtime artifact `tasks/runs/agent-server.sqlite`. Detecting it
is meaningful: `.gitignore` did not hide it from the hardened scope gate. The path was absent from
the next pre-test snapshot; subsequent sandbox-session evidence was stored outside the worktree.

The second attempt, `run-8bc98c57-3312-4d63-b60d-7b20351bc918`, recorded:

- `pnpm test` exit code zero;
- 669 of 669 tests across 42 files;
- 42,178 milliseconds in the report's test field;
- seven changed paths before and after tests;
- zero path-policy violations; and
- `passed` terminal status.

The report's whole-suite duration is functional-test timing, not latency, throughput, capacity, or
load evidence. The gate did not record `pnpm typecheck`, an eval run, or a clean-checkout
reproduction. Both JSON reports and their SQLite store are ignored local evidence rather than
retained GitHub artifacts.

## Delivery truth

At audit time:

- `tasks/ollama-repo-summary` existed only as a local branch;
- the branch, local `main`, `origin/main`, and the merge base all resolved to `d14fc13`;
- the seven experiment paths were uncommitted;
- no remote branch with that name existed;
- the public pull-request list ended at M8 PR `#9`;
- no GitHub Actions or CodeQL run existed after the M8 exact-merge workflows; and
- `delivery.type: pull_request` expressed intended delivery, not completed delivery.

M8 CI `33646021258` and CodeQL `33646020469` validate public merge `d14fc13`. They must not be
presented as verification of the local array compatibility change, timeout setting, task manifest,
or real-model sessions.

## Build Note implementation plan

1. Register Build Note 016 at the front of `src/lib/build-notes.ts` with slug
   `harness-first-real-model-ollama`, labeling `d14fc13` as the **base**, not an implementation
   commit.
2. Add `src/content/build-notes/HarnessFirstRealModel.tsx`, separating public M8 evidence, local
   event evidence, and shared-transcript evidence.
3. Add `src/components/build-notes/HarnessFirstRealModelDiagrams.tsx` with static, accessible,
   keyboard-scrollable diagrams for the provider path, identity versus authority, debugging
   chronology, and observed-run evidence ladder.
4. Add the article to the exhaustive route map in
   `src/app/(frontend)/build-notes/[slug]/page.tsx`.
5. Extend unit tests for metadata, evidence labels, exact metrics, diagrams, and prohibited release
   language.
6. Extend frontend smoke coverage and add a focused 390-by-844 acceptance check for diagram and
   table overflow.
7. Run formatting, both TypeScript checks, lint, the full website test suite, production build,
   static export, and focused browser acceptance.
8. Publish through the checks-gated Render Static Site and verify article metadata, BlogPosting
   JSON-LD, index order, RSS, sitemap, cache headers, security headers, and mobile layout.
9. Append website commit, workflow, deploy, page count, and production acceptance only after those
   facts exist.

## Files to inspect

Public M8 base:

- `packages/kernel/src/run.ts` — legacy multi-round loop and tool-argument normalization;
- `packages/models/src/openai-compatible.ts` — provider translation and 60-second default deadline;
- `services/agent-server/src/connection.ts` — ACP session admission and legacy run seam;
- `services/agent-server/src/sandbox-tool.ts` — conditional `sandbox_exec` tool registration path;
- `services/sandbox-runner/src/plan.ts` — manifest policy and Docker plan;
- `services/sandbox-runner/src/runner.ts` — Docker lifecycle, bounded output, and cleanup;
- `packages/acp/src/client.ts` — terminal client transport and request deadline; and
- `apps/tui` — interactive ACP client and event presentation.

Uncommitted experiment paths:

- `packages/kernel/src/run.ts` and `packages/kernel/test/run-agent.test.ts` — guarded-array fix and
  regressions;
- `services/agent-server/src/config.ts` and `services/agent-server/test/config.test.ts` — explicit
  provider timeout and validation;
- `services/agent-server/src/cli.ts` and `README.md` — operator documentation; and
- `tasks/ollama-repo-summary.yaml` — field-test contract, policy, and budget.

## Verification checklist

### Content and evidence

- [ ] The article calls `d14fc13` the public M8 base, not a commit containing the experiment.
- [ ] The article says “uncommitted local field test” near its title and evidence summary.
- [ ] The shared transcript confirms the exact prompt and final five-bullet answer before either is
      quoted.
- [ ] Run metrics match the durable SQLite records and distinguish completed, failed, and
      budget-exceeded statuses.
- [ ] `mounts: 0` is explained as zero writable mounts, not zero total mounts.
- [ ] The local 669-test gate is not labeled GitHub CI and does not imply typecheck passed.
- [ ] Context/token budgets and observed durations are not presented as benchmarks or load tests.
- [ ] The mutable local image, Node-version difference, and absence of image digest stay visible.

### Website

- [ ] Build Note metadata, route, article component, diagrams, and tests are implemented.
- [ ] Every table-of-contents entry resolves to a unique article section ID.
- [ ] Every diagram has meaningful image semantics and a keyboard-scrollable wrapper.
- [ ] Desktop and 390-pixel mobile layouts have no document-width overflow.
- [ ] Metadata, canonical URL, BlogPosting JSON-LD, Build Notes index, RSS, and sitemap are correct.
- [ ] Formatting, typechecks, lint, tests, build, and static export pass.
- [ ] Website CI and CodeQL pass for the publication commit.
- [ ] The checks-gated Render deploy becomes live and custom-domain acceptance passes.
- [ ] This record is updated with final website evidence without changing the Harness delivery
      truth.

## Limitations and claim controls

- Say “first completed local real-model sandbox loop,” not “first production agent.”
- Say “based on M8 merge `d14fc13`,” not “released in M8” or “M9 complete.”
- Say “configured model label,” not “cryptographically verified model weights.”
- Say “loopback Ollama endpoint,” not “the whole host was offline.”
- Say “policy denied six observed requests,” not “the policy blocks every shell bypass.”
- Say “read-only Docker inspection,” not “secure arbitrary-code execution.”
- Say “local gate passed 669 tests,” not “CI passed the experiment.”
- Say “request durations observed in manual sessions,” not “latency benchmark.”
- Do not claim repeatability, output determinism, answer correctness, production capacity, cost,
  concurrency, memory efficiency, or deployment readiness.
- Do not publish absolute home-directory paths, credentials, raw environment dumps, or ephemeral
  container names.

## Next work

1. Commit the seven-path experiment on its task branch and rerun tests plus strict TypeScript from
   a clean checkout.
2. Add deterministic provider-adapter coverage for guarded arrays at the package boundary rather
   than relying only on a `FakeModel` kernel test.
3. Decide whether the provider timeout belongs in the committed Agent Server contract and document
   operational bounds and cancellation interaction.
4. Pin the sandbox image by digest and retain its build provenance.
5. Retain a redacted, integrity-addressed real-model evidence bundle that includes the task,
   source commit, event stream, output, and environment selectors without secrets.
6. Add a repeatability eval that scores the five architecture claims against a fixed source
   snapshot; keep manual field observations separate from deterministic CI.
7. Open a pull request, require public CI and CodeQL, resolve review findings, merge, and reverify
   the exact merge before upgrading any release claim.
8. Continue M9 independently: implement and test `LocalWorkspace` path, link, race, bounded-I/O,
   cancellation, diff, snapshot, and disposal semantics. This field test does not satisfy that
   milestone.

## Production evidence

No website publication evidence exists yet. Add the website commit, GitHub CI, CodeQL, Render
deploy, generated-page count, custom-domain checks, responsive acceptance, and feed/sitemap checks
only after each result exists.

## Definition of done

- [x] The documentation record distinguishes public M8 evidence from local field evidence.
- [x] Exact session chronology, usage, tool, policy, sandbox, and gate metrics are recorded.
- [x] Delivery truth and unsupported claims are explicit.
- [x] Site implementation and publication verification are planned.
- [ ] Build Note 016 is implemented and verified locally.
- [ ] Website CI and CodeQL pass.
- [ ] The checks-gated Render Static Site publishes the article.
- [ ] Production acceptance evidence is appended.
