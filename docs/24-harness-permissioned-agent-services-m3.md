# Harness Platform M3 Permissioned Agent Services Build Note

Date: August 31, 2026  
Status: accepted in production

## Outcome

Build Note 009 documents Harness Platform Stage 1, Milestone 3 at:

```text
/build-notes/harness-permissioned-agent-services-m3/
```

Its narrow central claim is:

> M3 adds a typed WebSocket service, one kernel run per session, correlated operator approvals, a
> manifest-derived Docker execution plan, and a hardened OpenAI-compatible adapter. The complete
> control path is tested with real loopback WebSockets and deterministic fakes; live Docker and
> provider operation remain outside the evidence.

The note does not describe M3 as a production control plane, an externally interoperable ACP
implementation, a proven production sandbox, a live provider integration, a replay-safe service,
or a capacity result.

## User request and source handling

The user supplied a shared development conversation and asked for a new Harness M3 Build Note. The
conversation is treated as implementation chronology, debugging context, and session-only evidence.
It does not override the user request, the repository contract, or current public source. Its share
URL and private model deliberation are intentionally omitted from the public article.

Public source is pinned to:

| Evidence          | Reference                                  |
| ----------------- | ------------------------------------------ |
| M2 baseline       | `8f18f6dce437a9b580d5aa5f52c42f5ab66f05bd` |
| M3 implementation | `6a6141d26754da2ed8bd901bb5bd60b25d2b9ce0` |
| Public merge      | `defbf7bcf72fc72452b4adc81b099f3fc6c523cf` |
| Pull request      | `saberistic-team/harness-platform#1`       |
| Post-merge CI     | GitHub Actions run `33419713684`           |
| Post-merge CodeQL | GitHub Actions run `33419713633`           |

The Git-derived M2-to-M3 range contains 65 changed files, 13,615 insertions, and 352 deletions. The
shared-chat UI displayed a different aggregate, so the public comparison is the release authority.

Generated `tasks/runs/*.json` reports are ignored. The M3-specific passing report is summarized in
the pull-request body but is not a committed GitHub blob. Public post-merge CI runs the canonical
`kernel-0001` exit gate rather than the M3 manifest gate. The article keeps those evidence classes
separate.

## Architecture documented

```text
interactive TUI
      |
      | harness/acp/1 JSON-RPC over WebSocket
      v
agent-server -----> redact + SQLite append + ordered ACP notification
      |
      | one atomic prompt
      v
kernel -----> FakeModel or OpenAI-compatible adapter
      |
      | policy allow | ask | deny
      v
sandbox_exec -----> sandbox-runner -----> one Docker container
```

The note documents four connected boundaries:

1. The repository-owned `harness/acp/1` protocol and bounded WebSocket transport.
2. The kernel permission state machine and interactive TUI response path.
3. The manifest-derived Docker plan, mount proof, and cleanup ownership checks.
4. The OpenAI-compatible provider adapter and redacted audit/event boundary.

## Permission contract

The canonical sequence is:

```text
tool.call
policy.decision (effect=ask)
permission.requested
... paused; no side effect has run ...
permission.resolved (allow|deny)
tool.result
```

Only one correlated allow can resume the call. Denial, timeout, session cancellation, WebSocket
disconnect, terminal EOF, confirmation-reader failure, or a missing resolver all resolve to denial.
A run-scoped approval is cached only for the exact action and subject so the sandbox can repeat the
policy check without creating a second prompt or a global grant.

## Sandbox contract

The public source supports these implementation claims:

- the container root and base workspace mount are read-only, with approved paths overmounted
  writable;
- exact files and explicit `directory/**` entries can become writable submounts;
- traversal, absolute paths, unsafe wildcard shapes, links, devices, sockets, nested filesystems,
  missing sources, and widened directory scopes fail before Docker;
- selected mount identity, metadata, and tree shape are fingerprinted and synchronously revalidated
  before spawn;
- the container runs as the workspace owner with all capabilities dropped,
  `no-new-privileges`, one CPU, 512 MiB memory, a 128 PID limit, and a constrained temporary
  filesystem;
- network is `none` unless policy resolves to allow;
- patterned egress rules are rejected because the runner can represent only `none` or unrestricted
  Docker bridge access;
- images require an immutable digest unless a local tag is explicitly trusted for development;
- Docker uses `--pull never`, a local Unix socket, and isolated client configuration;
- cleanup uses the runner-owned container ID when available; a fallback name lookup is removable
  only when its private lease label matches;
- lifecycle evidence distinguishes owned-container confirmation from verified cleanup.

The Docker daemon, selected image, host kernel, and absence of a more privileged concurrent
workspace mutator remain trusted. The default test lane injects an argv-only executor and does not
launch Docker.

## Provider contract

The OpenAI-compatible adapter remains behind `packages/models`. It validates endpoint transport,
credentials, model identifiers, messages, tools, provider options, request/response sizes, JSON
depth and node count, stream chunks, timeouts, cancellation, finish reasons, tool calls, usage, and
provider errors.

`stream: false` is intentional. M3 streaming means ordered Harness event notifications, not model
token streaming. The adapter has no implicit retry loop so one request remains one observable model
turn. Its 50 focused tests inject HTTP behavior; no live provider was called.

## Development chronology represented

The public note includes only chronology that is corroborated by final code or observable session
records:

1. One task manifest was created for the four coupled M3 requirements.
2. An audit found that the pre-M3 headless CLI treated `ask` as executable; the shared kernel
   permission contract corrected it.
3. ACP methods and permission/sandbox events were defined before service and UI wiring.
4. Early provider, sandbox, and TUI slices were joined through the same event contract.
5. Security passes corrected run-grant caching, cancellation trails, late-opening sockets,
   backpressure, host-tool snapshots, hostile JSON, audit failure semantics, Docker ownership,
   link and mount races, external SQLite placement, and model-advertisement bounds.
6. A real loopback WebSocket plus fake Docker executor proved that two policy checks can reuse one
   run-scoped operator approval.
7. The first M3 exit gate blocked `.pnpm-store/v11/index.db`; store metadata moved outside the
   repository rather than widening the manifest.
8. The branch passed 333 tests and typecheck, then moved through PR #1 after CI and CodeQL passed.

## Visual plan

The note uses four accessible semantic HTML/CSS diagrams:

1. **Service boundary** — TUI to ACP, agent server, kernel, model seam, sandbox, SQLite, and events.
2. **Permission state machine** — allow, deny, ask, and every fail-closed terminal path.
3. **Sandbox planning pipeline** — manifest, path proof, hardened argv, ownership, and cleanup.
4. **Evidence lanes** — public/fresh offline proof, session-only M3 gate, and deliberately unrun
   live operations.

Each diagram has a figure caption, a full accessible description, a `role="img"` semantic region,
and a keyboard-scrollable outer region for narrow viewports. No model-authored image asset or SVG is
required.

## Site implementation plan

### Content and presentation

- Add `HarnessPermissionedServices.tsx` as the Git-authored article.
- Add `HarnessPermissionedServicesDiagrams.tsx` for the four accessible diagrams.
- Add narrowly scoped diagram styles to the shared frontend stylesheet.
- Pin the repository footer and source links to the exact public merge.
- Keep the content server-rendered/static; do not add article-specific client JavaScript.

### Discovery and SEO

- Add the note to the newest-first `buildNotes` manifest.
- Register the article component in the dynamic Build Note route.
- Generate the static route through the existing `generateStaticParams()` list.
- Include the route in BlogPosting/Breadcrumb structured data, sitemap, RSS, and Build Notes index
  through the existing metadata pipeline.
- Use the SEO title `Harness M3: permissioned agent services` and a summary under 200 characters.

### Verification

- Extend unit coverage for the exact pin, permission claim, sandbox boundary, evidence labels,
  diagrams, and code blocks.
- Extend frontend smoke coverage for the route, heading, table of contents, and evidence callouts.
- Extend static-export verification for canonical metadata and M3 content anchors.
- Run Prettier, focused unit tests, both type checks, lint, `pnpm verify`, and a focused Playwright
  route test.

### Release

- Commit and push the feature.
- Require repository CI and CodeQL to pass.
- Allow the checks-gated Render Static Site deploy to publish the generated route.
- Verify the custom-domain page, canonical, article structured data, RSS, sitemap, cache headers,
  and security headers.
- Record production acceptance in this document and the documentation index.

## Claim holds

The note must continue to state:

- ACP is project-owned; no external ACP compatibility is claimed.
- The default server uses `FakeModel` unless provider configuration is complete.
- `sandbox_exec` exists only for a task-backed session with a configured reviewed image.
- provider and Docker tests are deterministic fakes, not live-service evidence;
- network allow means ordinary Docker bridge access, not host-specific egress policy;
- remote operation requires an external TLS proxy and query-log redaction;
- redaction is a deterministic credential guard, not general DLP;
- persistence is local SQLite without replay or resume;
- MCP tools are not wired into the kernel;
- agent-server events are not wired into OpenTelemetry;
- there is no web approval UI, control plane, live deployment, load result, soak result, or capacity
  number.

## Acceptance checklist

- [x] Shared conversation read and distinguished from the request.
- [x] Public M3 merge and remote branch pins verified.
- [x] PR, post-merge CI, and CodeQL evidence verified.
- [x] Fresh 333-test, typecheck, eval, and manifest checks completed at the pinned source.
- [x] Article, diagrams, metadata, tests, and static-export checks implemented.
- [x] Root verification passes.
- [x] Focused browser acceptance passes.
- [x] Feature commit pushed and hosted checks pass.
- [x] Render Static Site deploy succeeds.
- [x] Production page, feeds, sitemap, caching, and headers pass.
- [x] Production acceptance is recorded here and in `docs/README.md`.

## Production acceptance

The feature shipped in website commit
`6f6c012b062891f8a39892dec5cf647f72860d16`. Hosted CI run `33422982684` passed both type checks,
lint, 167 tests with one intentional skip, the production build, and the reviewed-fixture static
export. CodeQL run `33422973211` passed in parallel.

The final checks-gated Render deployment was `dep-daas5d5490qs738kq120`. It built the same website
commit against Payload content revision `2e8da5a6f350`, generated 27 static pages, and verified nine
Build Notes plus five prototype routes. Scheduled Static Site Rebuild run `33423075621` happened to
start a duplicate same-commit deploy, `dep-daas4p6gekts738pkv4g`, while the hosted gates were still
running; the checks-gated deployment superseded it without changing the source revision.

Production checks against the custom domain confirmed:

- HTTP 200 for the Build Note, RSS feed, and sitemap;
- the exact SEO title and canonical URL;
- the pinned Harness merge `defbf7b` and all four accessible diagrams;
- one `BlogPosting` and one `BreadcrumbList` structured-data object;
- discovery through both `/build-notes/feed.xml` and `/sitemap.xml`;
- CDN caching with `s-maxage=300`; and
- the existing CSP, Permissions Policy, Referrer Policy, MIME-sniffing, and frame-denial headers.
