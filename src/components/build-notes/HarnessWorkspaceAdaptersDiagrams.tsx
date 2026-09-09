import type { ReactNode } from 'react'

import { DiagramFrame } from '@/components/build-notes/ArticlePrimitives'

function Node({
  children,
  detail,
  eyebrow,
  tone = 'default',
}: {
  children: ReactNode
  detail: string
  eyebrow: string
  tone?: 'accent' | 'default' | 'safe' | 'warning'
}) {
  return (
    <div className={`harness-m3-diagram__node harness-m3-diagram__node--${tone}`}>
      <span>{eyebrow}</span>
      <strong>{children}</strong>
      <small>{detail}</small>
    </div>
  )
}

function Arrow({ label = 'then' }: { label?: string }) {
  return (
    <span aria-hidden="true" className="harness-m3-diagram__arrow">
      <small>{label}</small>
      <b>→</b>
    </span>
  )
}

export function NativeWorkspaceSelectorDiagram() {
  return (
    <DiagramFrame
      description="At merge 6e1e578, the trusted native selector chooses Docker when backend is omitted or explicitly docker. Local execution requires both backend local and developerOnly true; Docker startup failure remains an error and never becomes ambient host execution. This selector is not yet the upstream Pi TaskAgent dispatch path."
      scrollable
      title="The safe default is a decision tree with no fallback edge"
    >
      <div
        aria-label="At merge 6e1e578, createNativeWorkspace accepts a trusted configuration object. When backend is omitted or set to docker, it constructs DockerWorkspace with a reviewed digest-pinned image. If Docker or the image is unavailable, construction fails closed; it does not catch the error and construct a local workspace. When backend is local, LocalWorkspace additionally requires developerOnly true and exact reviewed command vectors. Missing local opt-in, unknown backends, and malformed configuration fail before filesystem or process effects. The selector is available for native injection but upstream Pi TaskAgent dispatch remains unchanged until M16."
        className="harness-m3-diagram harness-m3-diagram--permission"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node detail="trusted launch boundary · validated object" eyebrow="CONFIG" tone="accent">
            Choose a native workspace
          </Node>
          <Arrow label="default" />
          <Node detail="backend omitted or docker · immutable image" eyebrow="M10" tone="safe">
            Open DockerWorkspace
          </Node>
          <Arrow label="failure" />
          <Node
            detail="daemon, image, policy, or cleanup error"
            eyebrow="FAIL CLOSED"
            tone="warning"
          >
            Return a typed error
          </Node>
        </div>
        <div
          aria-label="Native workspace selection branches"
          className="harness-m3-diagram__decision-grid"
        >
          <section>
            <strong>DEFAULT BRANCH</strong>
            <span>Docker is selected when no backend is named.</span>
          </section>
          <section>
            <strong>EXPLICIT LOCAL BRANCH</strong>
            <span>backend: local and developerOnly: true are both required.</span>
          </section>
          <section className="harness-m3-diagram__danger">
            <strong>NO FALLBACK BRANCH</strong>
            <span>Docker failure never turns into host execution.</span>
          </section>
        </div>
        <div aria-label="Selector delivery boundary" className="harness-m3-diagram__support-grid">
          <section>
            <strong>SHIPPED</strong>
            <span>Native selector and both operational adapters.</span>
          </section>
          <section>
            <strong>STILL SEPARATE</strong>
            <span>Legacy service admission and Pi TaskAgent dispatch.</span>
          </section>
          <section>
            <strong>INTEGRATION MILESTONE</strong>
            <span>M16 adopts the selector for native platform development.</span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function LocalWorkspaceBoundaryDiagram() {
  return (
    <DiagramFrame
      description="LocalWorkspace adapts M8 directly to the developer machine, so its defenses constrain paths, file types, sizes, command identity, cancellation and post-command scope rather than pretending to isolate same-user hostile code. macOS and Linux use different descriptor-safe open strategies."
      scrollable
      title="Trusted local mode narrows ambient authority without claiming isolation"
    >
      <div
        aria-label="At merge 6e1e578, LocalWorkspace first resolves and records the root directory identity, captures a bounded UTF-8 text snapshot, and emits an opened lifecycle event when an observer exists. Read and write operations reject traversal, dot Git segments, links, hard links, special files, executable modes, cross-device traversal and changed identities. macOS uses O_NOFOLLOW_ANY and Linux walks anchored directory descriptors through proc self fd. Process execution accepts only an exact argv vector declared in trusted configuration, uses a minimal environment and no shell, composes cancellation, kills the process group, and compares the tree after execution so out-of-scope changes fail. These measures do not isolate the adapter from a malicious process running as the same host user."
        className="harness-m3-diagram harness-m3-diagram--service"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node detail="realpath · device + inode · bounded text tree" eyebrow="OPEN">
            Pin the local root
          </Node>
          <Arrow label="validate" />
          <Node
            detail="relative paths · no links · checked descriptors"
            eyebrow="FILES"
            tone="accent"
          >
            Reject substitution
          </Node>
          <Arrow label="execute" />
          <Node
            detail="exact argv · shell false · minimal environment"
            eyebrow="PROCESS"
            tone="warning"
          >
            Run reviewed commands
          </Node>
          <Arrow label="compare" />
          <Node detail="allowed_paths checked after effect" eyebrow="SCOPE" tone="safe">
            Accept or fail
          </Node>
        </div>
        <div aria-label="Local file-open defenses" className="harness-m3-diagram__support-grid">
          <section>
            <strong>MACOS</strong>
            <span>O_NOFOLLOW_ANY rejects a symlink in any path component.</span>
          </section>
          <section>
            <strong>LINUX</strong>
            <span>Directory descriptors anchor every no-follow traversal step.</span>
          </section>
          <section>
            <strong>OTHER PLATFORMS</strong>
            <span>Safe local opens fail as unsupported.</span>
          </section>
        </div>
        <div
          aria-label="Local workspace trust statement"
          className="harness-m3-diagram__decision-grid"
        >
          <section>
            <strong>WHAT IS BOUNDED</strong>
            <span>Text I/O, file count, bytes, output, time, paths and argv.</span>
          </section>
          <section>
            <strong>WHAT IS CHECKED</strong>
            <span>Root identity, file identity and pre/post command scope.</span>
          </section>
          <section className="harness-m3-diagram__danger">
            <strong>WHAT IS TRUSTED</strong>
            <span>The developer host and reviewed local command still have host authority.</span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function DockerWorkspaceLifecycleDiagram() {
  return (
    <DiagramFrame
      description="DockerWorkspace captures a sanitized bounded text tree, sends it over stdin to one fresh M3-runner container per command, receives a bounded JSON envelope, validates every returned path and scope change, and carries only accepted text state forward. The repository itself is never mounted."
      scrollable
      title="Each Docker command crosses a copied-state validation loop"
    >
      <div
        aria-label="At merge 6e1e578, DockerWorkspace validates all configuration before reading the source. It captures a bounded regular UTF-8 text tree while omitting Git metadata and rejecting known credential-bearing paths. For each execute call, the host serializes the current tree and one argv request into a size-bounded JSON input. The reused M3 sandbox runner starts a fresh digest-pinned container with read-only root, network none, dropped capabilities, no inherited credentials, CPU, memory, PID, disk, output and time limits, and a writable tmpfs workspace instead of host mounts. A reviewed Node bootstrap reconstructs the tree, spawns the requested argv without a shell, kills the child process group on timeout, scans the resulting tree without following links, and returns a versioned JSON envelope. The host validates response shape, paths, sizes and allowed-path changes before accepting it as the next in-memory state. The container is removed before the operation settles. Disposal exports a bounded patch and declared artifacts, then clears state and removes the temporary host directory."
        className="harness-m3-diagram harness-m3-diagram--sandbox"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node detail="UTF-8 regular files · no .git or credential paths" eyebrow="CAPTURE">
            Sanitize a text copy
          </Node>
          <Arrow label="stdin" />
          <Node
            detail="fresh container · writable tmpfs · no host mounts"
            eyebrow="ISOLATE"
            tone="accent"
          >
            Execute direct argv
          </Node>
          <Arrow label="envelope" />
          <Node
            detail="version · tree · result · hard byte limits"
            eyebrow="VALIDATE"
            tone="warning"
          >
            Check returned state
          </Node>
          <Arrow label="accept" />
          <Node detail="next text tree · container already removed" eyebrow="CONTINUE" tone="safe">
            Carry state forward
          </Node>
        </div>
        <div
          aria-label="Docker workspace containment controls"
          className="harness-m3-diagram__support-grid"
        >
          <section>
            <strong>NO HOST AUTHORITY</strong>
            <span>No repository bind, home directory, Docker socket or SSH agent.</span>
          </section>
          <section>
            <strong>RESOURCE BOUNDS</strong>
            <span>Read-only root, tmpfs disk, cgroup memory/CPU, PID and time limits.</span>
          </section>
          <section>
            <strong>SCOPED RETURN</strong>
            <span>Validated text state, bounded Git patch and declared artifacts only.</span>
          </section>
        </div>
        <div aria-label="Docker lifecycle properties" className="harness-m3-diagram__decision-grid">
          <section>
            <strong>ONE COMMAND</strong>
            <span>One fresh container is created and force-removed.</span>
          </section>
          <section>
            <strong>ONE ACCEPTANCE POINT</strong>
            <span>Host validation decides whether output becomes new state.</span>
          </section>
          <section className="harness-m3-diagram__danger">
            <strong>NO LIVE RETENTION</strong>
            <span>A lease retains bounded output state, never a running container.</span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function WorkspaceAdaptersEvidenceDiagram() {
  return (
    <DiagramFrame
      description="M9–M10 combine shared offline conformance, a branch-specific Harness exit gate, PR and exact-merge CI/CodeQL, and a separate local live-Docker lane. The scheduled/manual hosted Docker workflow exists but had no run at publication audit time, so local isolation evidence and hosted merge evidence remain separate."
      scrollable
      title="Different gates answer different questions"
    >
      <div
        aria-label="The M9 and M10 evidence stack at publication time begins with 693 offline tests and ten skipped Docker-live cases in both branch and exact-merge CI. The branch head b77a4e9 passed strict TypeScript, one golden kernel scenario and the task-specific Harness exit gate; artifact 10122165511 retains that branch report. PR 11 then merged as 6e1e578 after CI and CodeQL were green. Exact-merge CI repeated strict TypeScript, 693 offline tests and one golden scenario, while the branch-only exit gate was correctly skipped on main; exact-merge CodeQL passed both Actions and JavaScript TypeScript analysis. The owner conversation reported ten local live Docker tests, and the publication audit independently reproduced all ten against the workflow's digest-pinned Node image with no leftover containers. The workspace-live workflow is scheduled and manually dispatchable, but no hosted run existed at audit time. These gates prove bounded functional and hostile-fixture behavior, not load capacity, penetration resistance or production isolation."
        className="harness-m3-diagram harness-m3-diagram--evidence"
        role="img"
      >
        <section>
          <strong>OFFLINE CONTRACT</strong>
          <b>693 passed · 10 skipped</b>
          <span>
            Shared conformance, malformed inputs, links, limits, cancellation and cleanup.
          </span>
        </section>
        <section>
          <strong>BRANCH DELIVERY</strong>
          <b>b77a4e9 · PR #11</b>
          <span>Typecheck, golden eval, Harness exit gate, artifact and CodeQL passed.</span>
        </section>
        <section>
          <strong>EXACT MERGE</strong>
          <b>6e1e578</b>
          <span>CI and both CodeQL analyses passed independently after merge.</span>
        </section>
        <section>
          <strong>LIVE DOCKER</strong>
          <b>10 / 10 local</b>
          <span>Pinned image, hostile probes, resources, cancellation, cleanup and expiry.</span>
        </section>
        <div
          aria-label="Workspace evidence claim boundary"
          className="harness-m3-diagram__decision-grid"
        >
          <section>
            <strong>RETAINED HOSTED EVIDENCE</strong>
            <span>Branch artifact plus public PR, CI and CodeQL records.</span>
          </section>
          <section className="harness-m3-diagram__danger">
            <strong>HOSTED LIVE LANE OPEN</strong>
            <span>The new scheduled/manual Docker workflow has not run yet.</span>
          </section>
          <section>
            <strong>NOT MEASURED</strong>
            <span>
              Concurrency, throughput, latency distribution, cost and hostile escape research.
            </span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}
