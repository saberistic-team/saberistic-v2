import { ArticleCallout, CodeBlock } from '@/components/build-notes/ArticlePrimitives'
import {
  DockerWorkspaceLifecycleDiagram,
  LocalWorkspaceBoundaryDiagram,
  NativeWorkspaceSelectorDiagram,
  WorkspaceAdaptersEvidenceDiagram,
} from '@/components/build-notes/HarnessWorkspaceAdaptersDiagrams'

const commit = '6e1e578747484bbad5a3651601c7b57854cc771f'
const head = 'b77a4e9638513f8cbd04b52f2b63a971e81c2600'
const repository = 'https://github.com/saberistic-team/harness-platform'
const source = (path: string) => `${repository}/blob/${commit}/${path}`

const milestoneContract = `M9 · LocalWorkspace
  developer-only host adapter
  bounded text I/O and exact reviewed argv
  symlink, identity and race defenses
  cancellation, snapshot, diff and disposal
  no claim of OS isolation

M10 · DockerWorkspace
  default native adapter
  clean copied worktree · never a repository mount
  digest-pinned image · network disabled
  bounded CPU, memory, PIDs, disk, time and output
  validated patch and declared artifacts only

shared boundary
  operational adapters are shipped
  Pi TaskAgent selection remains unchanged until M16`

const selectorContract = `createNativeWorkspace(config)
├── backend omitted ──────────────► DockerWorkspace
├── backend: "docker" ───────────► DockerWorkspace
├── backend: "local"
│   ├── developerOnly: true ─────► LocalWorkspace
│   └── otherwise ───────────────► configuration error
├── unknown or malformed config ─► configuration error
└── Docker open failure ─────────► error · never local fallback`

const commonBounds = `defaults
├── one file        1 MiB
├── total tree      8 MiB
├── file count      2,000
├── command output  1 MiB
└── command time    30 seconds

configurable ceiling
└── at most 4 × each default

accepted workspace content
├── relative UTF-8 text files
├── regular non-executable files
└── content-addressed SHA-256 snapshots

rejected
├── binary / NUL content
├── symlinks, hard links and special files
├── executable modes and cross-device traversal
└── .git and known credential-bearing paths in Docker capture`

const localExecution = `trusted launch configuration
└── allowedCommands: exact complete argv arrays

execution
├── shell: false
├── minimal environment
├── bounded stdout + stderr
├── shared timeout and AbortSignal
└── detached process group killed on timeout or cancellation

change admission
├── capture bounded tree before command
├── capture bounded tree after command
├── compute changed paths
└── reject any change outside allowed_paths`

const dockerPlan = `one execute() call
├── serialize current text tree + argv as bounded JSON
├── send request over stdin
├── start one fresh container with the M3 runner
│   ├── immutable digest-pinned Node image
│   ├── read-only root filesystem
│   ├── /workspace and /tmp on bounded tmpfs
│   ├── network none · capabilities dropped · no-new-privileges
│   ├── 1 CPU · 512 MiB memory · 128 PIDs
│   └── no home, repo mount, Docker socket, SSH agent or proxy secrets
├── execute direct argv through the reviewed bootstrap
├── return { version: 1, files, result }
├── remove the container
└── validate the envelope before accepting the next in-memory tree`

const outputContract = `exportOutputs()
├── patch
│   └── bounded Git tree diff from initial to accepted state
└── artifacts
    └── only explicitly declared artifact paths

retain(ms)
├── can be called once
├── maximum lease: 1 hour
├── requires a lifecycle observer
├── retains accepted state and outputs
└── never retains a live container

dispose()
├── exports final bounded outputs
├── clears retained in-memory state
├── removes temporary host runner data
└── emits a lifecycle event`

const verificationLedger = `branch head                         ${head}
merged main                         ${commit}
pull request                        #11 · merged
changed paths                       23
diff                                +1,250 / -38

branch task exit gate
├── tests                           693 / 693 passed
├── test files                      43 passed · 1 skipped
├── live Docker tests               10 skipped by design
├── scope violations                0
└── retained artifact digest        sha256:884ae0cfcd3e4ab569b150ed5d268a327a856afad494e6ad9f31dea092ac0a79

publication live-Docker audit
├── exact merge                     ${commit.slice(0, 7)}
├── tests                           10 / 10 passed
├── duration                        7.05 seconds
├── Docker                          Desktop 4.87.0 · Engine 29.7.2 · linux/arm64
└── remaining harness-* containers  0`

const deliveryLedger = `PR #11
├── title    feat(workspace): deliver M9 local and M10 Docker adapters
├── merged   2026-09-09 19:53:55 UTC
├── head     ${head}
└── merge    ${commit}

pull-request verification
├── CI       34397633607 · passed
├── CodeQL   34397629888 · passed
└── artifact gate-evidence-34397633607 · retained

exact-merge verification
├── CI       34397797152 · passed
└── CodeQL   34397797085 · passed

workspace-live workflow
├── manual + weekly Monday 03:43 UTC
└── hosted runs at publication audit: 0`

const currentTruth = [
  [
    'Backend selection',
    'The native selector defaults to Docker and requires a double opt-in for local mode.',
    'Pi TaskAgent and the legacy service do not yet use this selector; that integration is planned for M16.',
  ],
  [
    'Local safety',
    'Paths, file identities, exact argv, time, output and post-command changes are bounded.',
    'LocalWorkspace is a trusted developer adapter, not isolation from hostile same-user processes.',
  ],
  [
    'Docker isolation',
    'Each command used a fresh constrained container and no host repository mount.',
    'This is tested containment, not a security certification or penetration-test result.',
  ],
  [
    'Filesystem domain',
    'Both adapters operate on a bounded regular UTF-8 text tree.',
    'Binary files, executable files, links and special files are deliberately outside this milestone.',
  ],
  [
    'Allowed paths',
    'Out-of-scope modifications are rejected before becoming accepted adapter state.',
    'allowed_paths limits writes and changes; it is not a filesystem read allowlist.',
  ],
  [
    'Retention',
    'A bounded state/output lease can survive briefly for inspection and emits expiry evidence.',
    'No container is retained, and retention is not durable remote storage.',
  ],
  [
    'Live verification',
    'Ten hostile-fixture Docker tests passed locally against the exact merge.',
    'The new hosted scheduled/manual Docker workflow had not run at publication audit time.',
  ],
  [
    'Performance',
    'The focused local live suite completed in 7.05 seconds on one disclosed setup.',
    'There was no load, throughput, latency, cost or concurrency benchmark.',
  ],
] as const

const nextWork = `M11  canonical read / search / edit / patch / test tool suite
M16  make native workspace selection part of Pi TaskAgent dispatch
M35  broker short-lived credentials without returning host secrets

near-term operations
1     run and retain the hosted workspace-live lane
2     exercise adapters through the real agent loop
3     add controlled concurrency and resource-pressure measurements
4     keep local mode explicit as integration expands`

export function HarnessWorkspaceAdaptersArticle() {
  return (
    <>
      <section id="brief">
        <p className="eyebrow">01 / MILESTONE CONTRACT</p>
        <h2>M8 defined workspace authority. M9 and M10 make two deliberate ways to exercise it.</h2>
        <p className="article-lede">
          Harness now has an explicit developer-only adapter for trusted host work and a
          Docker-by-default adapter for disposable execution. Both implement the same Workspace
          capability, carry only bounded text state, produce reviewable outputs, and fail instead of
          silently widening authority.
        </p>
        <p>
          The pairing matters because “workspace” is no longer an abstract interface or an ambient
          current directory. The caller must choose a backend at a trusted launch boundary, and an
          omitted choice resolves to the isolated one. The merged implementation is pinned at{' '}
          <code>{commit.slice(0, 7)}</code>.
        </p>
        <CodeBlock code={milestoneContract} label="M9–M10 delivery boundary" language="text" />
      </section>

      <section id="pairing">
        <p className="eyebrow">02 / WHY THEY TRAVEL TOGETHER</p>
        <h2>One contract serves two trust models without pretending they are equivalent.</h2>
        <p>
          Local mode is useful for fast, trusted platform development where the command and host are
          already inside the developer&apos;s trust boundary. Docker mode is for disposable,
          copied-state execution where the repository, credentials, network and host services must
          remain outside the container. Shipping both against one contract makes the difference a
          visible configuration decision instead of scattered conditionals inside tools.
        </p>
        <ArticleCallout title="THE ADAPTER NAME IS PART OF THE SECURITY STORY" tone="note">
          <p>
            M9 narrows host effects but does not isolate them. M10 adds a container boundary. The
            shared API makes them substitutable to callers; it does not make their threat models
            interchangeable.
          </p>
        </ArticleCallout>
      </section>

      <section id="selector">
        <p className="eyebrow">03 / EXPLICIT BACKEND SELECTION</p>
        <h2>
          Docker is the default, local requires two affirmative choices, and failure stays failure.
        </h2>
        <p>
          <code>createNativeWorkspace</code> selects Docker when the backend is omitted or named
          explicitly. Local construction succeeds only when the caller chooses{' '}
          <code>backend: &quot;local&quot;</code> and supplies <code>developerOnly: true</code>. A
          missing daemon, unavailable image, invalid digest or configuration error is returned;
          there is no catch block that quietly executes on the host.
        </p>
        <NativeWorkspaceSelectorDiagram />
        <CodeBlock code={selectorContract} label="Trusted selector behavior" language="text" />
        <ArticleCallout title="AVAILABLE DOES NOT YET MEAN WIRED INTO PI" tone="warning">
          <p>
            The selector and adapters are exported for native injection, but upstream Pi TaskAgent
            dispatch remains unchanged. M16 is the planned integration point. These milestones do
            not claim a live-model run through the new adapters.
          </p>
        </ArticleCallout>
      </section>

      <section id="shared-domain">
        <p className="eyebrow">04 / BOUNDED WORKSPACE DOMAIN</p>
        <h2>Both backends reduce a worktree to the same small, inspectable data model.</h2>
        <p>
          Adapter state is a set of relative, regular, non-executable UTF-8 text files. Default
          limits bound each file, the whole tree, file count, command output and execution time;
          configuration can raise each ceiling only fourfold. Snapshots are content-addressed and
          diffs are generated as bounded Git patches.
        </p>
        <CodeBlock code={commonBounds} label="Shared adapter limits" language="text" />
        <p>
          The restriction is intentional. A text-oriented coding lane is much easier to validate
          across a trust boundary than a lossless clone of every filesystem object. Support for
          binaries or executable artifacts would need a separate reviewed contract rather than an
          accidental relaxation here.
        </p>
      </section>

      <section id="local-boundary">
        <p className="eyebrow">05 / LOCAL DEVELOPER ADAPTER</p>
        <h2>LocalWorkspace makes host execution explicit and checks every boundary it can own.</h2>
        <p>
          On open, the adapter resolves the workspace root, records its device and inode identity,
          captures a bounded snapshot, and emits lifecycle evidence when an observer is present. It
          accepts relative paths only and rejects Git internals, traversal, links, hard links,
          special files, executable files and cross-device movement.
        </p>
        <LocalWorkspaceBoundaryDiagram />
        <ArticleCallout title="TRUSTED DEVELOPMENT MODE, NOT A SANDBOX" tone="warning">
          <p>
            A reviewed process launched as the developer still has that user&apos;s ambient OS
            authority outside the workspace. The adapter prevents accidental widening through its
            own API; it cannot defend against a malicious same-user process racing or acting through
            unrelated host interfaces.
          </p>
        </ArticleCallout>
      </section>

      <section id="local-races">
        <p className="eyebrow">06 / PATH AND RACE DEFENSES</p>
        <h2>Validation is tied to checked file descriptors, not only preflight path strings.</h2>
        <p>
          A safe path check followed by an ordinary open leaves room for a symlink substitution. The
          implementation therefore uses platform-specific no-follow opens. macOS uses
          <code>O_NOFOLLOW_ANY</code>; Linux walks anchored directory descriptors through{' '}
          <code>/proc/self/fd</code> and refuses each linked component. Other platforms fail as
          unsupported rather than dropping to a weaker open.
        </p>
        <p>
          Parent directories must already exist for writes, file identity is rechecked, and a root
          identity change invalidates the operation. Those rules also keep recursive directory
          creation from becoming an unreviewed capability.
        </p>
      </section>

      <section id="local-effects">
        <p className="eyebrow">07 / PROCESSES AND CHANGE SCOPE</p>
        <h2>Commands are exact vectors, and their entire resulting tree is reviewed.</h2>
        <p>
          Local mode does not accept command prefixes or shell strings. Trusted configuration lists
          each complete argument vector, and execution uses <code>shell: false</code> with a minimal
          environment. Timeout and cancellation share one signal, and the executor kills the process
          group so a detached child cannot outlive the rejected operation.
        </p>
        <CodeBlock code={localExecution} label="Local command admission" language="text" />
        <p>
          After a command, Harness captures the tree again and compares every changed path against
          <code>allowed_paths</code>. Exact paths, directory wildcards and the explicit global
          wildcard are supported. This constrains what may change; it does not restrict what an
          already-admitted command can read from the workspace.
        </p>
      </section>

      <section id="docker-copy">
        <p className="eyebrow">08 / COPY, NEVER MOUNT</p>
        <h2>DockerWorkspace treats repository state as an input message.</h2>
        <p>
          Configuration is validated before the source tree is read. The source is then captured
          through the same local safety machinery, with <code>.git</code> omitted and common
          credential paths rejected before Docker starts. The current text tree and requested argv
          are serialized into bounded JSON and delivered over stdin to one fresh container.
        </p>
        <DockerWorkspaceLifecycleDiagram />
        <p>
          There is no host repository bind mount to remount, escape or accidentally make writable.
          Accepted state lives in host memory between commands; each new command reconstructs that
          state inside a new tmpfs workspace.
        </p>
      </section>

      <section id="docker-sandbox">
        <p className="eyebrow">09 / CONTAINER BOUNDARY</p>
        <h2>M10 extends the reviewed M3 runner instead of inventing a second sandbox path.</h2>
        <p>
          Disposable workspace mode reuses the existing container planner and cleanup machinery. It
          requires a digest-pinned image, makes the root filesystem read-only, disables network,
          drops capabilities, forbids privilege escalation, and bounds CPU, memory, PIDs, disk,
          output and time. The container receives no host home, Docker socket, SSH agent, proxy
          secrets or repository mount.
        </p>
        <CodeBlock code={dockerPlan} label="One DockerWorkspace command" language="text" />
        <p>
          The reviewed Node 22+ bootstrap reconstructs files, spawns the exact argv without a shell,
          kills the process group on timeout, and scans the result without following links. The
          container is removed before <code>execute()</code> settles.
        </p>
      </section>

      <section id="returned-state">
        <p className="eyebrow">10 / RETURNED-STATE VALIDATION</p>
        <h2>Container output is untrusted until the host accepts every byte and path.</h2>
        <p>
          The bootstrap returns a versioned envelope containing the resulting text tree and command
          result. The host requires the exact expected keys and types, then revalidates paths,
          encoding, modes, link counts, file count, byte limits and changed-path scope. A malformed,
          oversized or out-of-scope result fails without becoming the next workspace state.
        </p>
        <ArticleCallout title="THE CONTAINER DOES NOT AUTHORITATIVELY DECLARE SUCCESS" tone="note">
          <p>
            Docker supplies the isolation boundary; host-side validation supplies the state
            boundary. Only an accepted envelope can influence a later command or exported patch.
          </p>
        </ArticleCallout>
      </section>

      <section id="outputs">
        <p className="eyebrow">11 / PATCH, ARTIFACTS AND RETENTION</p>
        <h2>The adapter returns review material, not an opaque mutated worktree.</h2>
        <p>
          Disposal can export a bounded patch from the initial tree to accepted state plus only the
          artifact paths declared by the task. A caller may request one audited lease of at most one
          hour, but only when it supplies a lifecycle observer. The lease retains bounded state and
          outputs for inspection; it never keeps a container alive.
        </p>
        <CodeBlock code={outputContract} label="Workspace output lifecycle" language="text" />
      </section>

      <section id="lifecycle">
        <p className="eyebrow">12 / LIFECYCLE EVIDENCE</p>
        <h2>Open, snapshot, retention, expiry and disposal are first-class events.</h2>
        <p>
          M9–M10 add a versioned <code>workspace.lifecycle</code> event. It records the backend and
          phase, with a snapshot identifier or expiry time where relevant. It intentionally excludes
          file contents, command vectors and credentials. That creates an audit spine without
          turning the event store into a second workspace or secret archive.
        </p>
      </section>

      <section id="testing">
        <p className="eyebrow">13 / TWO VERIFICATION LANES</p>
        <h2>Fast conformance stays offline; real isolation requires a real daemon.</h2>
        <p>
          The ordinary suite checks both adapters&apos; contracts without requiring Docker, so PR
          and merge CI remain deterministic. A separate live suite starts real containers and
          attacks the boundary with links, out-of-scope writes, oversized output, timeouts, disk
          pressure, memory pressure, PID exhaustion, detached descendants, cancellation and
          retention expiry.
        </p>
        <WorkspaceAdaptersEvidenceDiagram />
        <ArticleCallout title="THE HOSTED LIVE LANE EXISTS, BUT HAD NOT RUN" tone="warning">
          <p>
            The new workflow is manual and weekly. At publication audit it had zero hosted runs. The
            ten live isolation checks reported here were reproduced locally against the exact merge;
            they must not be described as hosted CI evidence.
          </p>
        </ArticleCallout>
      </section>

      <section id="debugging">
        <p className="eyebrow">14 / WHAT LIVE DOCKER FOUND</p>
        <h2>The daemon exposed lifecycle races the offline contract could not.</h2>
        <p>
          The first live pass found a disposal race around container completion. Tightening cleanup
          made removal deterministic before an operation settles. The same review cycle strengthened
          local opens against ancestor symlink substitution and changed cancellation from killing
          one process to killing the whole process group.
        </p>
        <p>
          Those corrections are why a live lane is complementary to fakes: a fake can prove that the
          adapter asks for cleanup, but only the runtime can show whether container and process
          lifecycles actually close under interruption.
        </p>
      </section>

      <section id="task-gate">
        <p className="eyebrow">15 / MACHINE-READABLE SCOPE</p>
        <h2>The branch-specific exit gate tied 693 tests to an admitted 23-path change.</h2>
        <p>
          The retained run report records the task manifest, head and base identities, changed
          paths, zero scope violations and the full offline suite. Ten live tests were skipped in
          that lane by design. The resulting artifact is content-addressed and attached to the PR
          workflow, keeping branch evidence distinct from later publication checks.
        </p>
        <CodeBlock code={verificationLedger} label="Verification ledger" language="text" />
      </section>

      <section id="delivery">
        <p className="eyebrow">16 / CHECKS-GATED DELIVERY</p>
        <h2>PR review state, exact-merge CI and CodeQL all resolve to public commits.</h2>
        <p>
          PR #11 merged branch head <code>{head.slice(0, 7)}</code> into exact main commit{' '}
          <code>{commit.slice(0, 7)}</code>. PR CI and CodeQL passed before merge; fresh CI and
          CodeQL runs passed on the exact merge. The merge workflow correctly skipped the
          branch-only task exit gate, so the retained gate artifact belongs to the PR run—not the
          merge run.
        </p>
        <CodeBlock code={deliveryLedger} label="Public delivery record" language="text" />
      </section>

      <section id="verification">
        <p className="eyebrow">17 / VERIFIED RESULT</p>
        <h2>The exact merge passes both the portable suite and a local hostile-fixture audit.</h2>
        <p>
          Hosted exact-merge CI passed strict TypeScript, all 693 offline tests and the golden
          fixture. For this publication, the focused Docker suite then passed 10 of 10 checks in
          7.05 seconds on Docker Desktop 4.87.0, Engine 29.7.2, linux/arm64. No{' '}
          <code>harness-*</code> container remained, and the source repository was still clean at
          the exact merge afterward.
        </p>
        <ArticleCallout title="ONE FOCUSED RUN IS NOT A PERFORMANCE RESULT" tone="warning">
          <p>
            The 7.05-second figure is useful as test provenance only. There was no concurrency, load
            profile, repeated warm/cold sample, throughput target, cost study or penetration test.
          </p>
        </ArticleCallout>
      </section>

      <section id="limits">
        <p className="eyebrow">18 / CURRENT TRUTH</p>
        <h2>The strongest claims are specific—and leave the next integration work visible.</h2>
        <div
          aria-label="M9 and M10 workspace adapter evidence boundaries"
          className="article-table-wrap"
          role="region"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Surface</th>
                <th scope="col">What shipped or was observed</th>
                <th scope="col">What remains open</th>
              </tr>
            </thead>
            <tbody>
              {currentTruth.map(([surface, observed, open]) => (
                <tr key={surface}>
                  <th scope="row">{surface}</th>
                  <td>{observed}</td>
                  <td>{open}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="files">
        <p className="eyebrow">19 / FILE GUIDE</p>
        <h2>The implementation is concentrated in one package and one reused sandbox runner.</h2>
        <div className="file-guide">
          <article>
            <h3>Shared adapter contract</h3>
            <ul>
              <li>
                <a href={source('packages/workspace/src/adapter-common.ts')} rel="external">
                  packages/workspace/src/adapter-common.ts
                </a>{' '}
                — bounds, tree validation, snapshots, patch construction and lifecycle helpers.
              </li>
              <li>
                <a href={source('packages/workspace/src/selector.ts')} rel="external">
                  packages/workspace/src/selector.ts
                </a>{' '}
                — Docker default, explicit local opt-in and fail-closed construction.
              </li>
            </ul>
          </article>
          <article>
            <h3>Operational adapters</h3>
            <ul>
              <li>
                <a href={source('packages/workspace/src/local.ts')} rel="external">
                  packages/workspace/src/local.ts
                </a>{' '}
                — descriptor-safe local file access, exact commands and scope checks.
              </li>
              <li>
                <a href={source('packages/workspace/src/docker.ts')} rel="external">
                  packages/workspace/src/docker.ts
                </a>{' '}
                — sanitized capture, container requests, response validation and retained state.
              </li>
              <li>
                <a href={source('packages/workspace/src/container-program.ts')} rel="external">
                  packages/workspace/src/container-program.ts
                </a>{' '}
                — reviewed in-container reconstruction, direct execution and result scan.
              </li>
            </ul>
          </article>
          <article>
            <h3>Sandbox reuse</h3>
            <ul>
              <li>
                <a href={source('services/sandbox-runner/src/plan.ts')} rel="external">
                  services/sandbox-runner/src/plan.ts
                </a>{' '}
                — disposable workspace plan, tmpfs and containment controls.
              </li>
              <li>
                <a href={source('services/sandbox-runner/src/executor.ts')} rel="external">
                  services/sandbox-runner/src/executor.ts
                </a>{' '}
                — process-group cancellation and bounded Docker client execution.
              </li>
            </ul>
          </article>
          <article>
            <h3>Proof and task scope</h3>
            <ul>
              <li>
                <a href={source('packages/workspace/test/adapters.test.ts')} rel="external">
                  packages/workspace/test/adapters.test.ts
                </a>{' '}
                — shared and offline adapter conformance.
              </li>
              <li>
                <a href={source('packages/workspace/test/docker-live.test.ts')} rel="external">
                  packages/workspace/test/docker-live.test.ts
                </a>{' '}
                — real-daemon hostile fixtures and cleanup assertions.
              </li>
              <li>
                <a href={source('.github/workflows/workspace-live.yaml')} rel="external">
                  .github/workflows/workspace-live.yaml
                </a>{' '}
                — manual and scheduled hosted live lane.
              </li>
              <li>
                <a href={source('tasks/m9-m10-workspace-adapters.yaml')} rel="external">
                  tasks/m9-m10-workspace-adapters.yaml
                </a>{' '}
                — machine-readable milestone scope and exit criteria.
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section id="next">
        <p className="eyebrow">20 / WHAT IS NEXT</p>
        <h2>Give agents canonical tools, then connect the chosen workspace to Pi.</h2>
        <p>
          M9 and M10 answer where an admitted effect can run. M11 is the next functional layer: a
          canonical read, search, edit, patch and test suite expressed through the Workspace
          capability. M16 is where native selection reaches Pi TaskAgent dispatch. Credential
          brokering remains a later, separate capability rather than a reason to pass host secrets
          into either adapter.
        </p>
        <CodeBlock code={nextWork} label="Forward milestone boundary" language="text" />
      </section>

      <section id="sources">
        <p className="eyebrow">21 / EVIDENCE LEDGER</p>
        <h2>Every delivery claim resolves to a public source or a disclosed local audit.</h2>
        <ul className="evidence-list">
          <li>
            <a href={`${repository}/pull/11`} rel="external">
              Pull request #11
            </a>{' '}
            — reviewed delivery chronology and merge identity.
          </li>
          <li>
            <a href={`${repository}/actions/runs/34397633607`} rel="external">
              PR CI run 34397633607
            </a>{' '}
            — strict typecheck, 693 offline tests, golden fixture and retained branch gate artifact.
          </li>
          <li>
            <a href={`${repository}/actions/runs/34397629888`} rel="external">
              PR CodeQL run 34397629888
            </a>{' '}
            — Actions and JavaScript/TypeScript analysis on the branch head.
          </li>
          <li>
            <a href={`${repository}/actions/runs/34397797152`} rel="external">
              exact-merge CI run 34397797152
            </a>{' '}
            — portable suite on <code>{commit.slice(0, 7)}</code>.
          </li>
          <li>
            <a href={`${repository}/actions/runs/34397797085`} rel="external">
              exact-merge CodeQL run 34397797085
            </a>{' '}
            — Actions and JavaScript/TypeScript analysis on the merge commit.
          </li>
          <li>
            Publication audit — 10 of 10 focused live-Docker tests passed locally against the exact
            merge; the hosted live workflow had no run at audit time.
          </li>
        </ul>
      </section>
    </>
  )
}
