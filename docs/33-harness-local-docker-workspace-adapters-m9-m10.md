# Harness Platform M9–M10 Build Note

## Purpose

Publish Build Note 017 from the M9/M10 implementation conversation and the merged Harness source,
while separating public repository evidence, hosted checks, and the local live-Docker publication
audit.

The public article is:

- `/build-notes/harness-local-docker-workspace-adapters-m9-m10/`
- title: **Harness Platform M9–M10: choosing where an agent is allowed to work**
- repository: `saberistic-team/harness-platform`
- exact merge: `6e1e578747484bbad5a3651601c7b57854cc771f`

## Source audit

The note was reconstructed from four evidence classes:

1. The supplied ChatGPT conversation, including the initial milestone contract, implementation
   decisions, debugging chronology, approval boundary, and final summary.
2. The exact public merge and its source files, tests, task manifest, workflow, documentation, and
   event schema.
3. GitHub PR, CI, CodeQL, and retained branch-gate metadata.
4. A focused live-Docker rerun against the exact merge during publication.

### Delivery identities

| Item               | Identity                                   | Status                         |
| ------------------ | ------------------------------------------ | ------------------------------ |
| Branch head        | `b77a4e9638513f8cbd04b52f2b63a971e81c2600` | PR source                      |
| Pull request       | `#11`                                      | Merged 2026-09-09 19:53:55 UTC |
| Exact merge        | `6e1e578747484bbad5a3651601c7b57854cc771f` | Pinned article source          |
| PR CI              | `34397633607`                              | Passed                         |
| PR CodeQL          | `34397629888`                              | Passed                         |
| Exact-merge CI     | `34397797152`                              | Passed                         |
| Exact-merge CodeQL | `34397797085`                              | Passed                         |

PR #11 changed 23 paths with 1,250 insertions and 38 deletions. The branch task gate retained the
artifact `gate-evidence-34397633607` with digest
`sha256:884ae0cfcd3e4ab569b150ed5d268a327a856afad494e6ad9f31dea092ac0a79`.

## Product narrative

M8 defined a Workspace capability so tools no longer received ambient filesystem and process
authority. M9 and M10 provide two implementations of that capability:

- `LocalWorkspace` is an explicit developer-only adapter for trusted local integration.
- `DockerWorkspace` is the default native adapter and executes each command in a fresh,
  constrained container using copied text state rather than a repository mount.

They are documented together because the selector makes their trust difference an explicit launch
decision. Docker failure remains failure; it never falls back to host execution.

## Technical content contract

### Shared workspace domain

Both adapters accept a bounded tree of relative, regular, non-executable UTF-8 text files. Defaults
are:

- 1 MiB per file;
- 8 MiB for the tree;
- 2,000 files;
- 1 MiB of combined command output;
- 30 seconds per command.

Configuration can increase each bound only to four times its default. Binary/NUL content, links,
hard links, special files, executable modes, and cross-device traversal are rejected. Snapshots are
content-addressed with SHA-256 and changes export as bounded Git patches.

`allowed_paths` is a write/change boundary. It is not described as a read allowlist.

### LocalWorkspace

Local mode requires both `backend: "local"` and `developerOnly: true`. It:

- pins the resolved root device and inode;
- uses `O_NOFOLLOW_ANY` on macOS;
- uses anchored directory-descriptor traversal through `/proc/self/fd` on Linux;
- fails unsupported rather than weakening safe opens on another platform;
- requires existing parents for writes;
- admits only exact complete argv arrays from trusted configuration;
- uses `shell: false` and a minimal environment;
- kills the process group on timeout or cancellation;
- compares pre/post trees and rejects changes outside `allowed_paths`.

Claim boundary: these controls narrow the adapter API but do not isolate a hostile process running
as the same host user.

### DockerWorkspace

Docker configuration is validated before source capture. Source is reduced to bounded text state,
`.git` is omitted, and known credential paths are rejected before Docker starts. For each command:

1. The host serializes the current tree and argv as bounded JSON.
2. The request crosses stdin into one fresh container.
3. The reused M3 sandbox runner creates a writable tmpfs workspace with no host repository mount.
4. A reviewed Node bootstrap reconstructs files and directly spawns argv without a shell.
5. The bootstrap scans the resulting tree without following links and returns a versioned envelope.
6. The host revalidates response shape, paths, bytes, file types, and changed-path scope.
7. Only accepted text state can reach the next command.
8. The container is removed before the operation settles.

The container plan uses a digest-pinned image, read-only root, no network, dropped capabilities,
no-new-privileges, one CPU, 512 MiB memory, 128 PIDs, bounded tmpfs disk, no host home, no Docker
socket, no SSH agent, no proxy secrets, and no inherited credentials.

### Outputs and lifecycle

`exportOutputs()` returns a bounded patch and only explicitly declared artifact paths. `retain(ms)`
is a one-time state/output lease with a maximum of one hour and requires a lifecycle observer. It
does not retain a container. Disposal clears state, removes temporary runner data, and completes the
audited lifecycle.

The new `workspace.lifecycle` event records backend and phase, plus snapshot or expiry metadata when
applicable. It omits file content, argv, and credentials.

## Verification record

### Portable hosted lane

The PR gate passed:

- 693 of 693 offline tests;
- 43 passing test files and one skipped live-Docker file;
- strict TypeScript;
- one golden fixture;
- the branch-specific task gate with zero path violations.

Exact-merge CI independently passed strict TypeScript, 693 offline tests, and the golden fixture.
The branch-only task gate correctly skipped on `main`; no merge artifact is claimed. CodeQL passed
for the PR head and exact merge.

### Live-Docker publication audit

The focused suite was rerun locally against exact merge `6e1e578` with Docker Desktop 4.87.0,
Engine 29.7.2 on linux/arm64:

- 10 of 10 tests passed;
- one file passed;
- 7.05 seconds total, 6.78 seconds in tests;
- no `harness-*` container remained;
- the Harness repository remained clean at the exact merge.

The cases covered copied state, patch and artifact export, container destruction, credential and
host-service absence, disabled network, blocked root writes, link and scope rejection, output and
time limits, tmpfs disk pressure, memory pressure, PID exhaustion, detached descendants,
cancellation, and retention expiry.

The manual/weekly `workspace-live.yaml` workflow exists but had no hosted run at publication audit.
The article therefore labels the 10/10 result as local publication evidence, not hosted CI.

## Claim controls

The article may claim:

- both adapters and their selector are merged on public `main`;
- Docker is the default native selector branch;
- local execution requires an explicit developer-only opt-in;
- Docker state is copied over stdin and the repository is not mounted;
- PR and exact-merge CI/CodeQL passed;
- the focused live-Docker suite passed locally against the exact merge.

The article must not claim:

- Pi TaskAgent or legacy service integration;
- a real-model run through M9/M10;
- a hosted live-Docker workflow run;
- binary or executable workspace support;
- that `allowed_paths` limits reads;
- OS isolation in LocalWorkspace;
- a retained live container;
- a load, concurrency, latency, throughput, cost, production-readiness, penetration-test, or
  security-certification result.

## Article structure and diagrams

The note contains 21 navigable sections and four accessible, responsive diagrams:

1. selector decision tree;
2. LocalWorkspace boundary and platform-specific path defenses;
3. copied-state Docker execution lifecycle;
4. offline, hosted, branch-gate, and local-live evidence lanes.

Each visual has prose-equivalent accessible text, uses the established Build Note design system,
and is horizontally scrollable on narrow screens without widening the document viewport.

## Implementation files

- `src/content/build-notes/HarnessWorkspaceAdapters.tsx`
- `src/components/build-notes/HarnessWorkspaceAdaptersDiagrams.tsx`
- `src/lib/build-notes.ts`
- `src/app/(frontend)/build-notes/[slug]/page.tsx`
- `tests/unit/build-notes.test.tsx`
- `tests/e2e/frontend.e2e.spec.ts`
- `apps/site/scripts/verify-export.mjs`
- `docs/README.md`
- this document

## Publication checklist

- [x] Audit the supplied conversation as evidence, not instruction.
- [x] Pin every source link to the exact public merge.
- [x] Inspect implementation, tests, workflows, task manifest, PR, CI, CodeQL, and artifact record.
- [x] Reproduce the focused live-Docker suite locally.
- [x] Add metadata, article registration, RSS/sitemap-compatible registry entry, and four diagrams.
- [x] Add unit, export, route, mobile overflow, and accessible-diagram assertions.
- [x] Pass website formatting, lint, typecheck, unit, static export, and focused browser checks.
- [x] Commit and push website changes after review.
- [x] Wait for checks-gated Render Static Site deployment.
- [x] Verify the article, index, feed, sitemap, headers, cache, and mobile layout on the custom domain.
- [x] Record final website commit, CI, CodeQL, Render deploy, and production acceptance here.

## Production publication record

Website commit `add45553e6875c5a1e8fea8f6039f95204fc29e9` passed CI run `34400925588`
and CodeQL run `34400923967`. The checks-gated Render Static Site deployment
`dep-dags2qpsrm7s73c81h8g` completed successfully at 2026-09-09 20:29:14 UTC.

The production acceptance pass verified:

- the custom-domain article, Build Notes index, RSS feed, and sitemap returned HTTP 200;
- all three discovery surfaces contained the new slug;
- the article contained the pinned merge, 693/693 offline and 10/10 local-live evidence, and the
  hosted-live disclosure;
- BlogPosting and BreadcrumbList structured data were present;
- `Cache-Control: public, max-age=0, s-maxage=300` was present and the article produced a CDN hit;
- CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, Permissions Policy, and Referrer
  Policy were present;
- the focused production browser smoke and 390-pixel mobile overflow checks both passed;
- all four accessible scrollable diagrams were present.

The Render command-line token had expired during this audit. Deployment identity and success were
therefore read from the Render GitHub App deployment record, then independently confirmed from the
custom domain. No manual deploy was triggered.
