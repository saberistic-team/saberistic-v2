import { ArticleCallout, CodeBlock } from '@/components/build-notes/ArticlePrimitives'
import {
  DogfoodTimelineDiagram,
  InspirationLayersDiagram,
  KernelSequenceDiagram,
  TaskContractDiagram,
} from '@/components/build-notes/HarnessDiagrams'

const commit = '88ef2f4030ea7cb07a7d183032dc23a43eea734e'
const repository = 'https://github.com/saberistic-team/harness-platform'
const source = (path: string) => `${repository}/blob/${commit}/${path}`

const launchCommands = `# Start Pi with Ollama as its model provider
ollama launch pi

# The interactive picker showed this model for the session
qwen3.8:27b`

const quickStart = `pnpm install
pnpm test
pnpm typecheck
pnpm harness validate tasks/kernel-0001.yaml
pnpm harness run tasks/kernel-0001.yaml`

const repositoryTree = `harness-platform/
├── apps/
│   ├── cli/                 # working validate/run exit gate
│   ├── tui/                 # typed placeholder
│   └── web/                 # typed placeholder
├── services/
│   ├── agent-server/        # roadmap placeholder
│   ├── control-plane/       # roadmap placeholder
│   └── sandbox-runner/      # roadmap placeholder
├── packages/
│   ├── events/              # schemas + wire serialization
│   ├── kernel/              # local model/tool loop
│   ├── models/              # interface + FakeModel
│   ├── tools/               # validated tool registry
│   ├── policy/              # pure permission decisions
│   ├── sdk/                 # manifest in + report out
│   ├── sessions/            # in-memory append-only log
│   ├── workspace/           # lexical path scoping
│   ├── mcp/                 # contract types
│   └── acp/                 # contract types
├── tasks/                   # YAML contracts + ignored reports
├── evals/                   # future scenarios and golden repos
├── skills/                  # platform-builder operating guide
├── infra/                   # Docker + MinIO development files
└── {ARCHITECTURE,EVENTS,ROADMAP,SECURITY}.md`

const taskManifest = `id: kernel-0001
title: Add agent event serialization

goal: >
  Implement JSON serialization and deserialization for all kernel events.

acceptance:
  - All event variants round-trip without data loss
  - Unknown event versions return a typed error
  - Unit and integration tests pass

allowed_paths:
  - packages/events/**
  - packages/kernel/**
  - evals/**

permissions:
  fs.read: allow
  fs.write: ask
  process.exec:
    "pnpm test*": allow
    "pnpm lint*": allow
    "*": deny
  network: deny
  git.push: deny

budget:
  max_model_tokens: 100000
  max_tool_calls: 100

delivery:
  type: pull_request`

const eventEnvelope = `{
  "v": 1,
  "type": "agent.started",
  "eventId": "evt-…",
  "at": "2026-08-30T12:00:00.000Z",
  "actor": "kernel",
  "data": {
    "agentId": "agent-…",
    "sessionId": "sess-…",
    "model": "fake-model/v1"
  }
}`

const eventGates = `// The decoder fails at a precise boundary.
JSON.parse(raw)                         // EventParseError
supportedVersions.includes(event.v)    // EventVersionError
isEventType(event.type)                 // UnknownEventTypeError
eventSchemas[event.type].safeParse(...) // EventSchemaError`

const fakeModel = `const turn =
  this.queue.shift() ??
  { content: \`[fake-model] ack #\${seq}\` }

const promptTokens = estimateTokens(prompt)
const completionTokens = estimateTokens(scriptedCompletion)

return {
  content: turn.content ?? "",
  toolCalls: turn.toolCalls ?? [],
  usage: {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  },
}`

const kernelContract = `goal + model + tools + budget
                │
                ▼
        runAgent(options)
                │
       ┌────────┴────────┐
       ▼                 ▼
typed event stream   final text`

const pathGate = `const changed = changedPaths(cwd)
const violations = changed.filter(
  (path) =>
    path !== relManifest &&
    !pathAllowed(manifest.allowed_paths, path),
)

const policyCheck = {
  ok: violations.length === 0,
  violations,
}`

const reportExcerpt = `{
  "schema": "run-report/v1",
  "status": "passed",
  "branch": "tasks/kernel-0001",
  "policy": {
    "changedPathsOk": true,
    "changedPaths": [],
    "violations": []
  },
  "tests": {
    "command": "pnpm test",
    "exitCode": 0,
    "ok": true,
    "total": 40,
    "passed": 40,
    "failed": 0
  }
}`

const verification = `Test Files  6 passed (6)
Tests       40 passed (40)

$ pnpm typecheck
$ tsc -p tsconfig.json
# exit 0

$ pnpm harness validate tasks/kernel-0001.yaml
valid task manifest: kernel-0001 "Add agent event serialization"`

const commits = [
  {
    href: `${repository}/commit/1c17c71b0c8976c78ac344d8915dee3739345a49`,
    id: '1c17c71',
    text: 'M0 foundation: events, kernel, policy, SDK, CLI, packages, docs, and infrastructure scaffold.',
  },
  {
    href: `${repository}/commit/d2783c445d1fb6fd840e5aa4c3f10072a1651ce2`,
    id: 'd2783c4',
    text: 'Exit-gate fixes: path policy, event types, FakeModel accounting, kernel stop behavior, and pnpm build approval.',
  },
  {
    href: `${repository}/commit/c831d57ac18d7760d45c7285cb995ac4e4abf705`,
    id: 'c831d57',
    text: 'Report accuracy: parse Vitest’s Tests line instead of mistaking six test files for six tests.',
  },
  {
    href: `${repository}/commit/${commit}`,
    id: '88ef2f4',
    text: 'Public README and quick-start documentation.',
  },
] as const

const currentVsNext = [
  [
    'Events',
    '12 validated schemas and a typed wire decoder',
    'Durable storage and cross-process transport',
  ],
  [
    'Kernel',
    'Local model/tool loop with event and budget handling',
    'Provider adapter and sandbox execution',
  ],
  ['Model', 'Deterministic offline FakeModel', 'Ollama/OpenAI-compatible adapter'],
  [
    'Policy',
    'Pure allow/ask/deny decisions and dirty-path checks',
    'Runtime enforcement and approval flow',
  ],
  ['State', 'In-memory append-only session log', 'SQLite, then Postgres'],
  ['Interfaces', 'Working CLI exit gate', 'Read-only TUI, task board, then interactive clients'],
  ['Protocols', 'MCP and ACP TypeScript shapes', 'Live MCP client and ACP server'],
  [
    'Operations',
    'Docker/MinIO development files',
    'OTel, isolated runners, S3 and later Kubernetes',
  ],
] as const

export function HarnessFromScratchArticle() {
  return (
    <>
      <section id="why-a-harness">
        <p className="eyebrow">01 / THE QUESTION</p>
        <h2>Why build a harness when good coding agents already exist?</h2>
        <p className="article-lede">
          I had just learned to see a coding agent as more than a chat window. The model is only one
          component. A harness supplies the loop, context, tools, permissions, workspace, event
          history, budgets, and delivery rules that turn model output into controlled work.
        </p>
        <p>
          Pi, OpenCode, Goose, and OpenHands each made a different boundary visible. My goal was not
          to clone all four. I wanted to build a small vertical slice so I could understand where a
          harness earns trust: at the contracts between intention, execution, and evidence.
        </p>
        <p>
          The learning method came from Linux From Scratch. Instead of beginning with a finished
          platform, I would assemble one layer at a time, keep every boundary inspectable, and make
          the project operate on itself as early as possible. The working name became{' '}
          <strong>Harness from Scratch</strong>.
        </p>
        <ArticleCallout title="A useful definition">
          <p>
            A model proposes what to do. A harness decides what context and tools it receives,
            mediates what it may do, records what happened, and determines whether the result is
            acceptable.
          </p>
        </ArticleCallout>
      </section>

      <section id="mental-model">
        <p className="eyebrow">02 / THE MENTAL MODEL</p>
        <h2>Four projects helped me separate the layers.</h2>
        <p>
          I used the projects below as design references, not dependencies. The repository produced
          on this day does not import their code or claim compatibility with them.
        </p>
        <div className="reference-grid">
          <article>
            <h3>
              <a href="https://github.com/earendil-works/pi" rel="external">
                Pi <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>
              The smallest useful center: an interactive coding agent, provider-neutral model API,
              tool calls, state, and a terminal loop. Pi also ran this bootstrap session.
            </p>
          </article>
          <article>
            <h3>
              <a href="https://github.com/anomalyco/opencode" rel="external">
                OpenCode <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>
              A reference for named agents, permission modes, subagent work, session-oriented
              operation, and product surfaces around the loop.
            </p>
          </article>
          <article>
            <h3>
              <a href="https://github.com/aaif-goose/goose" rel="external">
                Goose <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>
              A reference for extensible capabilities and open protocols, especially tools arriving
              through MCP and clients connecting through ACP.
            </p>
          </article>
          <article>
            <h3>
              <a href="https://github.com/OpenHands/OpenHands" rel="external">
                OpenHands <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>
              A reference for the lower operational boundary: agent servers, workspaces, isolated
              execution, automations, and interfaces that can switch between backends.
            </p>
          </article>
        </div>
        <InspirationLayersDiagram />
        <p>
          That first five-level sketch was an exploration map. The repository’s final{' '}
          <a href={source('ARCHITECTURE.md')} rel="external">
            architecture contract
          </a>{' '}
          simplifies it to contracts, execution, services, and interfaces. That is the more useful
          boundary because it describes code that can be tested.
        </p>
      </section>

      <section id="scope-m0">
        <p className="eyebrow">03 / THE FIRST CUT</p>
        <h2>I reduced the platform to one M0 exit gate.</h2>
        <p>
          The initial idea included a web app, TUI, control plane, agent server, sandbox runner,
          SQLite, Postgres, object storage, observability, MCP, ACP, Docker, and eventually
          Kubernetes. Building all of that first would have produced a wide scaffold with no proof
          that the central contracts worked.
        </p>
        <p>So I imposed three constraints:</p>
        <ol className="article-steps">
          <li>
            <span>01</span>
            <div>
              <h3>One language until measurement says otherwise</h3>
              <p>TypeScript, Node 22 or newer, and pnpm workspaces across every layer.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Offline determinism before a live model adapter</h3>
              <p>
                A scripted FakeModel would make the kernel testable without network or credentials.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>A manifest in and a report out</h3>
              <p>
                The first milestone would accept a task contract, evaluate an existing working tree,
                run verification, and emit machine-readable evidence.
              </p>
            </div>
          </li>
        </ol>
        <ArticleCallout title="M0 exit condition" tone="success">
          <p>
            Validate one task manifest, check its branch and dirty paths, run the permitted test
            command, and write a validated <code>run-report/v1</code> result with a non-zero exit on
            failure.
          </p>
        </ArticleCallout>
      </section>

      <section id="bootstrap">
        <p className="eyebrow">04 / BOOTSTRAPPING WITH PI</p>
        <h2>Pi was the harness; Qwen was the model.</h2>
        <p>
          I launched Pi through Ollama and selected the model label shown in the session. Pi
          supplied the interactive harness—context, read/write/edit/bash tools, and the turn loop.
          Qwen supplied model output. The files and commits were their result, but the new
          repository does not embed either Pi or Qwen.
        </p>
        <CodeBlock code={launchCommands} label="Session launch" language="shell" />
        <p>
          The long bootstrap prompt described the monorepo, task schema, events, fake model, policy
          engine, tests, documentation, and infrastructure direction. I also gave it an explicit
          finish line: do not stop at a file tree; demonstrate the task manifest and report
          pipeline.
        </p>
        <ArticleCallout title="About the transcript">
          <p>
            This article condenses the session into observable commands, files, failures, fixes, and
            test output. It does not reproduce the model’s private deliberation. Where the note and
            the current repository differ, the repository at commit <code>88ef2f4</code> is treated
            as the source of truth.
          </p>
        </ArticleCallout>
        <p>
          The session itself ran on Node 24.18.0 and pnpm 11.15.1. The repository deliberately
          targets Node 22 or newer. Ollama now documents the same{' '}
          <a href="https://docs.ollama.com/integrations/pi" rel="external">
            <code>ollama launch pi</code> integration
          </a>{' '}
          and Pi’s core coding tools.
        </p>
      </section>

      <section id="repository">
        <p className="eyebrow">05 / REPOSITORY SHAPE</p>
        <h2>The monorepo separates contracts from products and processes.</h2>
        <p>
          I wanted the kernel to remain a local library rather than become a microservice. Apps can
          present the work; services can schedule and isolate it; packages own the portable
          contracts. That keeps the part most likely to be evaluated—goal, model, tools, budget,
          events—small enough to reason about.
        </p>
        <CodeBlock code={repositoryTree} label="M0 repository map" language="text" />
        <p>
          At the verified public commit, the repository contains 73 tracked files and 3,847 lines
          excluding the lockfile. The breadth is real, but maturity is uneven by design: the CLI and
          core packages work; the TUI, web app, and three services are placeholders that declare
          future boundaries.
        </p>
        <CodeBlock
          code={quickStart}
          label="Current quick start"
          language="shell"
          sourceHref={`${repository}/blob/${commit}/README.md`}
        />
      </section>

      <section id="task-contract">
        <p className="eyebrow">06 / TASK CONTRACT</p>
        <h2>The manifest became the spine of the design.</h2>
        <p>
          A natural-language request is useful to a model, but it is a weak contract for a runner. I
          wanted the same input to express scope, proof, permissions, resource ceilings, and the
          expected delivery form. That became <code>tasks/kernel-0001.yaml</code>.
        </p>
        <CodeBlock
          code={taskManifest}
          label="tasks/kernel-0001.yaml"
          language="yaml"
          sourceHref={source('tasks/kernel-0001.yaml')}
        />
        <dl className="article-definitions">
          <div>
            <dt>Goal + acceptance</dt>
            <dd>Human intent and observable completion criteria.</dd>
          </div>
          <div>
            <dt>Allowed paths</dt>
            <dd>The portion of the working tree this task is permitted to change.</dd>
          </div>
          <div>
            <dt>Permissions</dt>
            <dd>Declared allow, ask, and deny decisions for files, commands, network, and Git.</dd>
          </div>
          <div>
            <dt>Budget</dt>
            <dd>Maximum model tokens and tool calls for a future integrated run.</dd>
          </div>
          <div>
            <dt>Delivery</dt>
            <dd>The intended artifact—in this case, a pull request.</dd>
          </div>
        </dl>
        <TaskContractDiagram />
        <ArticleCallout title="Implemented boundary" tone="warning">
          <p>
            M0 validates every field, but the CLI currently enforces only dirty-path scope and the
            test command decision. Goal, acceptance, model budget, network denial, Git denial, and
            delivery are contracts for later integration—not sandbox guarantees today.
          </p>
        </ArticleCallout>
      </section>

      <section id="events">
        <p className="eyebrow">07 / EVENTS</p>
        <h2>Events are the common language between replaceable parts.</h2>
        <p>
          If the kernel can run locally, in a sandbox, or inside an evaluation, its observable
          output cannot depend on a particular UI or database. I used a fixed envelope and twelve
          discriminated payload schemas.
        </p>
        <CodeBlock
          code={eventEnvelope}
          label="Canonical event envelope"
          language="json"
          sourceHref={source('packages/events/src/schemas.ts')}
        />
        <ul className="event-catalog" aria-label="Implemented event types">
          {[
            'session.created',
            'agent.started',
            'agent.stopped',
            'model.request',
            'model.response',
            'tool.call',
            'tool.result',
            'task.updated',
            'budget.warning',
            'policy.decision',
            'run.recorded',
            'error',
          ].map((event) => (
            <li key={event}>
              <code>{event}</code>
            </li>
          ))}
        </ul>
        <p>
          The decoder is intentionally staged. Invalid JSON, an unsupported envelope version, an
          unknown event type, and an invalid payload are different operational failures. A caller
          might retry one, migrate another, quarantine a third, and treat the last as a producer
          bug.
        </p>
        <CodeBlock
          code={eventGates}
          label="Ordered deserialization gates"
          language="TypeScript"
          sourceHref={source('packages/events/src/serialize.ts')}
        />
        <ArticleCallout title="Honest edge">
          <p>
            The current ISO timestamp schema checks for a non-empty string rather than parsing a
            real ISO date. Version and unknown-type errors preserve the raw object; parse and schema
            errors do not yet preserve equivalent raw input despite the broader documentation claim.
          </p>
        </ArticleCallout>
      </section>

      <section id="kernel">
        <p className="eyebrow">08 / DETERMINISTIC CORE</p>
        <h2>A fake model made the real loop testable.</h2>
        <p>
          The first model implementation is deliberately not Ollama. <code>FakeModel</code> replays
          a queue of scripted turns, records requests, estimates tokens deterministically, and
          returns a fixed acknowledgement when the queue is empty. That makes tool calls and budget
          edges reproducible offline.
        </p>
        <CodeBlock
          code={fakeModel}
          label="Condensed FakeModel behavior"
          language="TypeScript"
          sourceHref={source('packages/models/src/fake-model.ts')}
        />
        <p>The kernel contract then stays narrow:</p>
        <CodeBlock code={kernelContract} label="Kernel input and output" language="text" />
        <p>
          On each turn, the kernel emits a model request, calls the model, records usage, and emits
          a response. With no tool calls it stops successfully. With tool calls it validates
          arguments against the tool’s Zod schema, executes the registered tool, emits a typed
          result, adds that result to context, and continues. Token and tool-call ceilings can warn
          and stop the run.
        </p>
        <KernelSequenceDiagram />
        <ArticleCallout title="Two separate working slices">
          <p>
            The local <code>runAgent</code> kernel and the CLI exit gate both work, but they are not
            wired together yet. <code>pnpm harness run</code> evaluates an existing working tree; it
            does not invoke Pi, Qwen, <code>runAgent</code>, or any tool that edits code.
          </p>
        </ArticleCallout>
      </section>

      <section id="policy-and-gate">
        <p className="eyebrow">09 / POLICY + EVIDENCE</p>
        <h2>The harness’s best moment was refusing its own work.</h2>
        <p>
          The policy package is pure: given a permission map, action, and optional subject, it
          returns
          <code>allow</code>, <code>ask</code>, or <code>deny</code>. More-specific patterns win.
          For paths, <code>*</code> stays within one segment while <code>**</code> can cross
          directories.
        </p>
        <p>
          The CLI combines that decision logic with Git status, tests, and report generation. Its
          pipeline is schema → branch → dirty paths → command policy → tests → evidence.
        </p>
        <CodeBlock
          code={pathGate}
          label="Dirty-path scope gate"
          language="TypeScript"
          sourceHref={source('apps/cli/src/run.ts')}
        />
        <p>
          The first real run was blocked. The new scaffold touched root, app, service,
          documentation, and infrastructure files while the task allowed only{' '}
          <code>packages/events/**</code>, <code>packages/kernel/**</code>, and{' '}
          <code>evals/**</code>. That was not a nuisance. It was the first evidence that the
          contract could contradict the builder and win.
        </p>
        <p>
          After the base scaffold was committed, the task branch was cleaned up, type and event bugs
          were fixed, and the report parser was corrected, a later run passed with no dirty paths
          and no policy violations.
        </p>
        <DogfoodTimelineDiagram />
        <CodeBlock code={reportExcerpt} label="Condensed passing report" language="json" />
        <ArticleCallout title="What this pass proves—and does not" tone="warning">
          <p>
            It proves the schema, policy, test, and report plumbing can return a green result on a
            clean branch. It does not prove autonomous implementation from the manifest. The path
            gate reads <code>git status</code>, so committed branch differences disappear from its
            view. Base-branch diffing and real sandbox enforcement belong in the next milestone.
          </p>
        </ArticleCallout>
      </section>

      <section id="debugging">
        <p className="eyebrow">10 / WHAT BROKE</p>
        <h2>The failures improved the design more than the initial scaffold did.</h2>
        <div className="bug-ledger">
          <article>
            <span>01</span>
            <div>
              <h3>The policy result lied</h3>
              <p>
                Violations were calculated correctly, but <code>ok</code> was hard-coded to{' '}
                <code>true</code>. A rogue Dockerfile reproduction exposed it. The fix tied truth to
                the data: <code>ok: violations.length === 0</code>.
              </p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <h3>The model’s usage total was zero</h3>
              <p>
                FakeModel originally failed to add prompt and completion estimates. That undermined
                budget tests, so accounting became an explicit part of every deterministic turn.
              </p>
            </div>
          </article>
          <article>
            <span>03</span>
            <div>
              <h3>A successful agent stopped twice</h3>
              <p>
                The kernel emitted <code>agent.stopped</code> inside the successful branch and again
                after the loop. A <code>done</code> state made the terminal event singular.
              </p>
            </div>
          </article>
          <article>
            <span>04</span>
            <div>
              <h3>The task contract looked like an illegal change</h3>
              <p>
                The manifest itself appeared in Git status but was not inside its own allowed paths.
                The runner now exempts that input while still checking every output path.
              </p>
            </div>
          </article>
          <article>
            <span>05</span>
            <div>
              <h3>The report counted files, not tests</h3>
              <p>
                The first green report extracted “Test Files 6” and called that the test total. The
                parser now prefers Vitest’s “Tests 40” line. Evidence is only useful when it names
                the right unit.
              </p>
            </div>
          </article>
          <article>
            <span>06</span>
            <div>
              <h3>The package manager enforced its own boundary</h3>
              <p>
                pnpm 11 blocked the esbuild install script until the workspace explicitly approved
                it with <code>allowBuilds</code>. That accidental lesson matched the project:
                defaults should make execution visible, not magical.
              </p>
            </div>
          </article>
        </div>
        <details className="article-details">
          <summary>More fixes from the session</summary>
          <div>
            <p>
              Other iterations corrected an invalid <code>z.record().passthrough()</code> call,
              literal types written as <code>false as const</code> inside interfaces, a queue field
              colliding with a method, event generics resolving to <code>never</code>, a mistaken
              glob expectation, relative manifest resolution, test Git repositories with no initial
              file, and a commit that landed on the wrong branch.
            </p>
            <p>
              These are not all equally important. Together they show why an agent harness needs
              deterministic feedback and explicit evidence instead of relying on a convincing final
              message.
            </p>
          </div>
        </details>
      </section>

      <section id="verification">
        <p className="eyebrow">11 / VERIFIED RESULT</p>
        <h2>What I can substantiate at the public commit.</h2>
        <div className="article-metrics" aria-label="Verified repository metrics">
          <div>
            <strong>73</strong>
            <span>tracked files</span>
          </div>
          <div>
            <strong>3,847</strong>
            <span>lines excluding lockfile</span>
          </div>
          <div>
            <strong>6</strong>
            <span>test files</span>
          </div>
          <div>
            <strong>40 / 40</strong>
            <span>tests passing</span>
          </div>
        </div>
        <CodeBlock code={verification} label="Independent verification" language="text" />
        <p>
          I re-cloned the public repository at <code>88ef2f4</code>, installed its locked
          dependencies, and reran the checks. The test fixtures inherit a developer’s global Git
          signing setting, so I disabled signing for their temporary repositories; with that
          environment isolation, all 40 tests passed. Type checking and manifest validation passed
          directly.
        </p>
        <ol className="commit-list" aria-label="Public commit sequence">
          {commits.map((item) => (
            <li key={item.id}>
              <a href={item.href} rel="external">
                <code>{item.id}</code>
              </a>
              <span>{item.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section id="limits">
        <p className="eyebrow">12 / CURRENT TRUTH</p>
        <h2>M0 is a foundation, not the finished platform.</h2>
        <p>
          It would be easy to turn the directory names into a claim that the platform already has a
          distributed control plane, secure sandboxes, durable sessions, live protocols, and a web
          console. It does not. The table keeps working code and roadmap work separate.
        </p>
        <div className="article-table-wrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Area</th>
                <th>Working now</th>
                <th>Next contract</th>
              </tr>
            </thead>
            <tbody>
              {currentVsNext.map(([area, current, next]) => (
                <tr key={area}>
                  <th scope="row">{area}</th>
                  <td>{current}</td>
                  <td>{next}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ArticleCallout title="Security boundary" tone="warning">
          <p>
            Today, <code>network: deny</code>, <code>git.push: deny</code>, and{' '}
            <code>fs.write: ask</code> are manifest declarations, not OS-level controls. The
            read-file tool is not wired to workspace scoping, the sandbox runner reports{' '}
            <code>ready: false</code>, and the headless CLI currently blocks <code>deny</code> but
            not <code>ask</code>. Do not run untrusted work as though this were an isolation
            boundary.
          </p>
        </ArticleCallout>
        <p>
          The public{' '}
          <a href={source('ROADMAP.md')} rel="external">
            roadmap
          </a>{' '}
          names the sequence honestly: CI and SQLite first, then evaluation credibility and a web
          task board, followed by a real agent server, sandbox runner, provider adapter, control
          plane, Postgres, object storage, and only then a Kubernetes decision.
        </p>
      </section>

      <section id="files">
        <p className="eyebrow">13 / FILE GUIDE</p>
        <h2>Where to read the implementation.</h2>
        <div className="file-guide">
          <article>
            <p className="eyebrow">CONTRACTS</p>
            <h3>Start with the boundaries</h3>
            <ul>
              <li>
                <a href={source('tasks/kernel-0001.yaml')} rel="external">
                  Task manifest
                </a>
              </li>
              <li>
                <a href={source('packages/sdk/src/task-manifest.ts')} rel="external">
                  Manifest schema
                </a>
              </li>
              <li>
                <a href={source('packages/sdk/src/run-report.ts')} rel="external">
                  Run-report schema
                </a>
              </li>
              <li>
                <a href={source('ARCHITECTURE.md')} rel="external">
                  Architecture contract
                </a>
              </li>
            </ul>
          </article>
          <article>
            <p className="eyebrow">CORE LOOP</p>
            <h3>Then follow one run</h3>
            <ul>
              <li>
                <a href={source('packages/kernel/src/run.ts')} rel="external">
                  Kernel loop
                </a>
              </li>
              <li>
                <a href={source('packages/models/src/fake-model.ts')} rel="external">
                  FakeModel
                </a>
              </li>
              <li>
                <a href={source('packages/tools/src/tool.ts')} rel="external">
                  Tool contract
                </a>
              </li>
              <li>
                <a href={source('packages/events/src/schemas.ts')} rel="external">
                  Event catalog
                </a>
              </li>
            </ul>
          </article>
          <article>
            <p className="eyebrow">GATES</p>
            <h3>Inspect how work is judged</h3>
            <ul>
              <li>
                <a href={source('packages/policy/src/index.ts')} rel="external">
                  Policy decisions
                </a>
              </li>
              <li>
                <a href={source('apps/cli/src/run.ts')} rel="external">
                  CLI exit gate
                </a>
              </li>
              <li>
                <a href={source('apps/cli/test/run.test.ts')} rel="external">
                  Gate integration tests
                </a>
              </li>
              <li>
                <a href={source('SECURITY.md')} rel="external">
                  Security model
                </a>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section id="next">
        <p className="eyebrow">14 / NEXT DEVELOPMENT LOG</p>
        <h2>The next useful milestone is not more scaffolding.</h2>
        <p>
          The project now needs to make the two working slices meet. The operator loop should run in
          CI against a real base-branch diff, treat headless <code>ask</code> as blocked, persist
          events in SQLite, and execute the first evaluation scenario. After that, a real provider
          adapter can connect the manifest, kernel, policy decisions, and report into one auditable
          run.
        </p>
        <ol className="next-list">
          <li>
            <span>01</span>
            <strong>Make the exit gate a required CI check.</strong>
          </li>
          <li>
            <span>02</span>
            <strong>Compare the task branch with its base, not only Git status.</strong>
          </li>
          <li>
            <span>03</span>
            <strong>Persist the typed event stream in SQLite.</strong>
          </li>
          <li>
            <span>04</span>
            <strong>Run one golden-repository evaluation end to end.</strong>
          </li>
          <li>
            <span>05</span>
            <strong>Wire a real model only after those controls are observable.</strong>
          </li>
        </ol>
        <ArticleCallout title="Day one conclusion" tone="success">
          <p>
            I started by asking an agent to build an agent harness. The important result was not
            that it generated a monorepo. It was that the emerging system found reasons to distrust
            its own work—and could turn those reasons into code, tests, policy, and evidence.
          </p>
        </ArticleCallout>
      </section>

      <section id="sources">
        <p className="eyebrow">SOURCES + PROVENANCE</p>
        <h2>Primary material used for this note.</h2>
        <ul className="source-list">
          <li>
            <a href={`${repository}/tree/${commit}`} rel="external">
              Harness Platform at verified commit 88ef2f4
            </a>
          </li>
          <li>
            <a href="https://docs.ollama.com/integrations/pi" rel="external">
              Ollama’s Pi integration documentation
            </a>
          </li>
          <li>
            <a href="https://github.com/earendil-works/pi" rel="external">
              Pi Agent Harness repository
            </a>
          </li>
          <li>
            <a href="https://github.com/anomalyco/opencode" rel="external">
              OpenCode repository
            </a>
          </li>
          <li>
            <a href="https://github.com/aaif-goose/goose" rel="external">
              Goose repository
            </a>
          </li>
          <li>
            <a href="https://github.com/OpenHands/OpenHands" rel="external">
              OpenHands repository
            </a>
          </li>
        </ul>
        <p className="article-source-note">
          Build-session chronology comes from my attached local Pi transcript. Repository claims
          were checked against the public commit above and rerun locally on 30 August 2026.
        </p>
      </section>
    </>
  )
}
