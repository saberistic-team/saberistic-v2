import { ArticleCallout, CodeBlock, DiagramFrame } from '@/components/build-notes/ArticlePrimitives'

const commit = '58113f8651a2f9449d5bd2b51f85a637379a5f99'
const repo = 'https://github.com/saberistic-team/r3n'

function Flow({
  title,
  description,
  steps,
}: {
  title: string
  description: string
  steps: readonly (readonly [string, string])[]
}) {
  return (
    <DiagramFrame title={title} description={description} scrollable>
      <div
        className="harness-m3-diagram"
        style={{ minWidth: '38rem' }}
        role="img"
        aria-label={description}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '0.75rem',
          }}
        >
          {steps.map(([name, detail], i) => (
            <div
              key={name}
              className="harness-m3-diagram__node harness-m3-diagram__node--accent"
              style={{ minWidth: 0 }}
            >
              <span>0{i + 1}</span>
              <strong>{name}</strong>
              <small>{detail}</small>
            </div>
          ))}
        </div>
      </div>
    </DiagramFrame>
  )
}

const cycle = `Start
  → Qwen plans from the root question, recent notes and previous briefing
  → researcher questions take priority over AI proposals
  → Brave researches each admitted question
  → each complete answer is saved immediately
  → Qwen briefs findings, gaps, contradictions and relationships
  → the next plan builds on that briefing

Pause
  → stop scheduling new work
  → let the current provider call finish and save
  → resume the saved stage when Start is pressed`

const retrieval = `selected investigations
  ├─ FTS5 / BM25: up to 40 keyword candidates
  ├─ local embeddings: up to 40 semantic candidates
  │    exact cosine similarity · minimum score 0.3
  └─ graph: matching aliases + mentions in top-ranked passages
       at most 2 hops · 40 evidence connections

combine keyword and semantic ranks
  score contribution = 1 / (30 + zero-based rank)
  add bounded graph evidence contributions

select answer context
  at most 12 passages
  at most 3 passages per note
  at most 18,000 characters
  deduplicate normalized passage text

Qwen returns claims with excerpt IDs
  → server attaches exact saved quotes
  → validated answer + retrieval snapshot are persisted`

const evidence = `model output (illustrative)
{
  "status": "partial",
  "claims": [
    {"text": "A claim supported by the notebook.", "evidence": ["E1"]}
  ],
  "gaps": ["Which evidence would resolve the remaining uncertainty?"],
  "caveats": ["The retrieved material covers only the selected investigations."]
}

server-owned mapping
  E1 → passage ID + exact original excerpt

validation
  unknown ID → reject
  quote absent from passage → reject
  answered/partial with zero claims → reject
  insufficient with claims → reject`

const files = `data/
  research.sqlite3           # authoritative investigation state
  knowledge.sqlite3          # retrieval index and saved Q&A
  <investigation-id>/
    README.md                # linked notebook
    investigation.json       # exported state
    plans/cycle-001.md
    notes/<question-id>.md
    raw/<question-id>.json
    briefings/cycle-001.md
    graph.json               # cycle-briefing graph
    graph.mmd                # Mermaid export
    knowledge/<answer-id>.md
    knowledge/<answer-id>.json

ZIP export also contains knowledge/graph.json
  passage-level entities, aliases, relations, quotes and coverage`

const limits = [
  [
    'Research control',
    'Continuous Start/Pause cycles and an optional answer budget.',
    'Pause waits for the current request; the answer count is not a dollar limit.',
  ],
  [
    'Knowledge answers',
    'Keyword, semantic and graph retrieval within selected investigations.',
    'Independent questions; previous Q&A is not conversational memory.',
  ],
  [
    'Citations',
    'Exact saved excerpts, immutable answer snapshots and validated IDs.',
    'Text matching does not prove that the excerpt entails the claim.',
  ],
  [
    'Source material',
    'Brave answers, attached URLs, raw responses and collection dates.',
    'Original webpages are not fetched or independently verified.',
  ],
  [
    'Graph',
    'Passage-backed relationships, typed aliases and bounded traversal.',
    'No whole-corpus community synthesis or semantic entity merging.',
  ],
  [
    'Scale',
    'SQLite and exact vector similarity in Python.',
    'Designed for a local notebook; no capacity or load benchmark is recorded.',
  ],
] as const

export function R3NArticle() {
  return (
    <>
      <section id="idea">
        <p className="eyebrow">01 / FOLLOW THE QUESTION</p>
        <h2>A research question should leave behind a notebook you can keep asking.</h2>
        <p className="article-lede">
          R3N started with a simple loop: ask a question, collect an answer, identify what is still
          missing, and keep investigating. Brave Answers handles web research. A local Qwen model
          plans the next questions and writes briefings. Every completed answer becomes a saved
          note, and the growing collection becomes something the researcher can query directly.
        </p>
        <p>
          The first version solved collection. The second added retrieval: passages, embeddings,
          evidence-linked relationships, and an “Ask your research” interface. Together they make
          two useful workflows—expanding a topic with new research and answering questions from what
          has already been collected.
        </p>
        <p>
          This note follows implementation commit <code>{commit.slice(0, 7)}</code>. R3N is a local
          Python application with SQLite and plain browser JavaScript, requiring no third-party
          Python packages or frontend build step. The repository is public, with source links pinned
          to the implementation described here.
        </p>
      </section>

      <section id="cycles">
        <p className="eyebrow">02 / PLANNING → RESEARCH → BRIEFING</p>
        <h2>Start keeps the investigation moving; Pause gives the researcher control.</h2>
        <p>
          The initial idea evolved from rounds with approval checkpoints into continuous research
          controlled by Start and Pause. Qwen receives the root question, recent evidence, the
          question index and the previous briefing. It proposes specific follow-ups around gaps and
          contradictions. Researcher-submitted questions take priority, including questions added
          while a planning call is in progress.
        </p>
        <Flow
          title="One cycle becomes context for the next"
          description="The researcher starts an investigation. Local Qwen plans questions, Brave Answers researches them, SQLite saves each complete answer, and local Qwen writes a briefing that feeds the next plan. Pause is checked between provider calls."
          steps={[
            ['Plan', 'Local Qwen · root question + previous briefing'],
            ['Research', 'Brave Answers · prioritized question queue'],
            ['Save', 'SQLite + Markdown · one completed answer at a time'],
            ['Brief', 'Local Qwen · findings, gaps and next direction'],
          ]}
        />
        <CodeBlock code={cycle} label="Research lifecycle" language="text" />
        <p>
          The default batch is three questions with no total answer limit. An optional budget caps
          successfully saved answers. Provider errors pause the investigation with a recoverable
          stage; there are no automatic provider retries. Empty or duplicate-only plans stop the
          loop instead of issuing repeated searches.
        </p>
        <ArticleCallout title="PAUSE SAVES THE IN-FLIGHT RESULT" tone="note">
          <p>
            Pause is cooperative. A current Brave or Qwen call finishes before the worker stops.
            Completed answers survive a later synthesis failure and are reused on resume. A failed
            remote request can still consume API credits, so the answer budget does not guarantee a
            spending ceiling.
          </p>
        </ArticleCallout>
      </section>

      <section id="providers">
        <p className="eyebrow">03 / PROVIDER RESPONSIBILITIES</p>
        <h2>Brave brings in evidence; local Qwen decides where to look next.</h2>
        <p>
          R3N calls Brave&apos;s streaming Answers endpoint in single-search mode and owns the
          multi-round orchestration itself. It preserves complete answer text, source links, usage
          metadata and the raw response. Citation fragments split across stream chunks are
          reassembled; incomplete streams are not accepted as completed answers.
        </p>
        <p>
          Ollama serves the configured <code>qwen3.8:27b-mlx</code> model through its HTTP chat API.
          Structured output schemas constrain plans, briefings, graph extraction and answers. The
          configured tag is used explicitly; the app neither downloads weights nor silently switches
          models. The <code>-mlx</code> suffix is part of that tag and does not configure the
          inference backend.
        </p>
        <p>
          Only the root and current question go to Brave. Research context goes to the configured
          Ollama server. A serialized model scheduler coordinates planning, synthesis, embeddings,
          graph extraction and Q&A so they do not compete through overlapping local inference.
          Interactive questions take priority after the current call finishes.
        </p>
      </section>

      <section id="storage">
        <p className="eyebrow">04 / A DURABLE NOTEBOOK</p>
        <h2>SQLite holds the state; Markdown makes the investigation portable.</h2>
        <p>
          The research database records investigation state, queued questions, cycles and saved
          answers. Markdown and JSON files are generated views, refreshed on updates and startup.
          Restarted investigations resume in a paused state, and a synchronously reserved Start
          prevents two clicks from launching duplicate workers.
        </p>
        <CodeBlock code={files} label="Notebook and export layout" language="text" />
        <p>
          The knowledge database adds passages, FTS5, vectors, aliases, mentions, relations,
          relationship evidence and answer history. This was enough to support graph traversal
          locally without adding a graph database service. The original research store remains
          authoritative for collected material; saved knowledge answers retain their own evidence
          snapshots.
        </p>
      </section>

      <section id="indexing">
        <p className="eyebrow">05 / MAKING NOTES SEARCHABLE</p>
        <h2>The second version gave older notes a route back into the answer.</h2>
        <p>
          The research loop uses bounded recent context. That works for deciding the next question,
          but it cannot expose every older finding on every turn. The knowledge layer splits saved
          answers into roughly 1,400-character passages with 180-character overlap, preserving exact
          offsets into the original Markdown.
        </p>
        <p>
          Local <code>qwen3-embedding:0.6b</code> embeddings support semantic search. Normalized
          vectors are stored in SQLite and cached by text and model. Existing notes are indexed at
          startup, new answers are indexed incrementally, and completed work is reused. If
          embeddings fail, keyword and available graph retrieval can still answer a question; the
          interface reports the missing coverage and allows indexing retries.
        </p>
        <Flow
          title="Saved notes become three retrieval routes"
          description="Saved Brave answers are split into exact passages. Passages feed SQLite FTS5 keyword search, local Ollama embeddings for semantic search, and local Qwen extraction of relationships backed by excerpts. All three routes preserve investigation and note identity."
          steps={[
            ['Passages', 'Exact substrings · original offsets · note identity'],
            ['Keywords', 'SQLite FTS5 · BM25 ranking'],
            ['Meaning', 'Ollama embeddings · cached vectors'],
            ['Connections', 'Qwen extraction · passage-backed relationships'],
          ]}
        />
      </section>

      <section id="graph">
        <p className="eyebrow">06 / RELATIONSHIPS WITH EVIDENCE</p>
        <h2>Qwen extracts the connections; the application owns their supporting text.</h2>
        <p>
          Graph extraction operates on small passage batches. Each relation includes both typed
          endpoints, its label, a confidence category and selected evidence IDs. The server derives
          entities from those endpoints, attaches the original quotes and validates the result.
          Shared concepts connect findings across notes. Explicit grounded aliases merge only within
          the same investigation and entity type, while conflicting relationship labels remain
          separate.
        </p>
        <p>
          R3N maintains two graphs: the initial cycle graph links investigations, questions, sources
          and briefing concepts; the knowledge graph links passage-level entities and relationships
          used during retrieval. A relationship is an interpretation of notebook evidence.
          Traversing it locates supporting passages; it does not create another independent source.
        </p>
      </section>

      <section id="retrieval">
        <p className="eyebrow">07 / ASK YOUR RESEARCH</p>
        <h2>Keyword matches, semantic similarity and graph paths share one bounded context.</h2>
        <p>
          A knowledge question searches one or more selected investigations. FTS5 finds lexical
          matches, embeddings find related wording, and entity aliases or mentions in highly ranked
          passages seed graph traversal. Reciprocal-rank fusion combines keyword and semantic
          candidates without requiring their raw scores to use the same scale.
        </p>
        <CodeBlock code={retrieval} label="Retrieval and answer pipeline" language="text" />
        <p>
          The first implementation loads the selected vectors into memory and computes exact
          similarity in Python. Two-hop traversal, a connection cap, per-note diversity and a
          context budget keep retrieval bounded. These are practical local-notebook choices; larger
          collections would need measured retrieval evaluation and an indexed vector backend.
        </p>
        <p>
          Asking the notebook works while collection is paused and never calls Brave. “Research this
          gap” explicitly adds a follow-up question to the research queue. It does not restart a
          paused investigation. Q&A history is saved, but each new question is self-contained rather
          than inheriting conversational memory.
        </p>
      </section>

      <section id="citations">
        <p className="eyebrow">08 / THE LIVE-TEST CORRECTION</p>
        <h2>Asking the model to copy a quotation was the wrong interface.</h2>
        <p>
          The live implementation session exposed an exact-match failure: Qwen sometimes changed
          formatting while copying quotations. The validator correctly rejected the result, but
          making the model reproduce text added a needless failure mode. The fix was to prepare
          immutable excerpts and ask Qwen to select their IDs. The application then attaches the
          exact text itself.
        </p>
        <Flow
          title="Evidence identity stays under application control"
          description="The application assigns IDs to immutable notebook excerpts. Qwen selects IDs for each claim or relationship. The server rejects unknown IDs and attaches the original passage text. Saved answers retain the retrieved passages and scope so later indexing does not change their citations."
          steps={[
            ['Prepare', 'Application assigns IDs to exact excerpts'],
            ['Select', 'Qwen associates claims with excerpt IDs'],
            ['Validate', 'Reject unknown IDs · attach original text'],
            ['Retain', 'Persist answer, scope and passage snapshots'],
          ]}
        />
        <CodeBlock code={evidence} label="Illustrative citation contract" language="json / text" />
        <p>
          Another live edge case produced a relationship with an undeclared endpoint. The final
          relation-based schema includes both endpoint objects, allowing the application to derive
          the concept set and prevent dangling names by construction.
        </p>
        <ArticleCallout title="EXACT QUOTES ESTABLISH PROVENANCE" tone="note">
          <p>
            Citation validation proves that a selected excerpt exists in the saved passage. It does
            not prove that the excerpt supports every part of the generated claim or that the
            underlying information is true. R3N currently indexes Brave-generated answers and their
            attached URLs, rather than independently retrieved copies of the original pages.
          </p>
        </ArticleCallout>
      </section>

      <section id="interface">
        <p className="eyebrow">09 / RESEARCHER CONTROLS</p>
        <h2>The useful interface is the path from an answer back to its evidence.</h2>
        <p>
          The notebook exposes the question queue, Start/Pause controls, saved notes, briefings and
          a concept graph. “Ask your research” adds investigation scope, answer history, indexing
          coverage, an evidence map and clickable passage citations. Opening a citation highlights
          its exact excerpt and provides a route to the complete note and its source links.
        </p>
        <p>
          Answer exports include both readable Markdown and JSON with retrieved passage snapshots,
          retrieval methods, scope, graph connections and limitations. This preserves the evidence
          behind an answer even if later indexing changes the active passage tables. The interface
          shows the latest 40 answers, while the database retains the complete history.
        </p>
      </section>

      <section id="results">
        <p className="eyebrow">10 / WHAT WAS VERIFIED</p>
        <h2>Thirty-nine fixture tests pass, with live observations recorded in the build chat.</h2>
        <p>
          The publication audit reproduced all <strong>39 tests</strong> at commit{' '}
          <code>{commit.slice(0, 7)}</code>, including the four loopback HTTP tests. Fixtures cover
          continuous cycles, cooperative pause, question priority, duplicate starts, failure
          recovery, budgets, stream parsing, scope isolation, semantic retrieval, graph expansion,
          alias handling, citation rejection, abstention and export snapshots. They consume no Brave
          credits.
        </p>
        <p>
          The supplied conversation records live Brave and Qwen use, nine preserved research notes,
          27 embedded passages and two completed knowledge answers whose attached quotations matched
          saved passages. One answer retrieved seven graph connections. The final graph schema
          succeeded on a live batch, with remaining extraction continuing in the background. These
          are observations from that session; publication did not repeat paid research or publish
          the researcher&apos;s notebook.
        </p>
        <p>
          The implementation was pushed directly to <code>main</code>. No pull requests or hosted
          workflow runs were returned by the repository audit. The recorded evidence supports
          working local research and retrieval; it does not establish retrieval-quality scores, load
          capacity, a latency benchmark or independent fact verification.
        </p>
        <CodeBlock
          code={`python3 -m unittest discover -s tests -v\n# 39 tests · OK · includes loopback HTTP fixtures\n\nnode --check web/app.js\nnode --check web/knowledge.js`}
          label="Reproducible local verification"
          language="sh"
        />
      </section>

      <section id="limits">
        <p className="eyebrow">11 / CURRENT BOUNDARIES</p>
        <h2>The next work is evidence quality and scale measurement.</h2>
        <div
          className="article-table-wrap"
          role="region"
          tabIndex={0}
          aria-label="R3N capabilities and remaining work"
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Surface</th>
                <th scope="col">Implemented</th>
                <th scope="col">Boundary</th>
              </tr>
            </thead>
            <tbody>
              {limits.map(([name, done, open]) => (
                <tr key={name}>
                  <th scope="row">{name}</th>
                  <td>{done}</td>
                  <td>{open}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Original-page ingestion would improve source inspection. A curated question set could
          measure retrieval coverage, citation support and abstention quality. Community summaries
          would extend the current local graph-assisted approach toward broader synthesis across the
          collection. Each is a distinct next step; none requires choosing a graph database before
          measuring the actual bottleneck.
        </p>
        <p>
          The application serves one local researcher on loopback. It checks Host and Origin on
          writes, uses a per-process write token and renders provider content without executing
          HTML. Public hosting and multi-user operation would require a separate deployment and
          access-control design.
        </p>
      </section>

      <section id="files">
        <p className="eyebrow">12 / IMPLEMENTATION GUIDE</p>
        <h2>The research loop and the knowledge layer meet at saved notes.</h2>
        <p>These source links point to the public implementation commit.</p>
        <div className="file-guide">
          {[
            [
              'r3n/engine.py',
              'Continuous state machine, researcher priority, pause checkpoints and evidence-aware briefings.',
            ],
            [
              'r3n/providers.py',
              'Brave streaming, structured Ollama calls, embedding validation and the shared inference scheduler.',
            ],
            [
              'r3n/store.py',
              'SQLite investigation state, generated notebook files and export lifecycle.',
            ],
            [
              'r3n/knowledge.py',
              'Passages, FTS5, vectors, graph extraction, hybrid retrieval, citations and answer snapshots.',
            ],
            [
              'r3n/server.py',
              'Local HTTP routes, write admission and asynchronous knowledge questions.',
            ],
            [
              'web/knowledge.js',
              'Investigation scope, answer history, evidence map and excerpt viewer.',
            ],
            [
              'tests/test_knowledge.py',
              'Retrieval, citation, alias, migration and snapshot regressions.',
            ],
          ].map(([path, description]) => (
            <article key={path}>
              <h3>
                <a href={`${repo}/blob/${commit}/${path}`} rel="external">
                  {path}
                </a>
              </h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <p>
          The build conversation supplied the chronology and live observations; the pinned source
          and reproduced fixture suite supplied the implementation evidence. No API keys, local
          research records or private notebook contents are included in this article.
        </p>
      </section>
    </>
  )
}
