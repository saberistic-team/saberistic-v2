# R3N Build Note 018

## Article

- Route: `/build-notes/r3n-continuous-research-local-graphrag/`
- Title: R3N: from continuous web research to a notebook you can ask
- Source: https://github.com/saberistic-team/r3n
- Commit: `58113f8651a2f9449d5bd2b51f85a637379a5f99`
- Supplied conversation: https://chatgpt.com/s/cx_6aa1e0cc33ac819185e266ac0eec743c
- Repository visibility verified public after the owner changed it during authoring.

## Implementation plan and result

1. Reconstruct the two implementation stages from the supplied chat: continuous Start/Pause
   research, then local graph-assisted knowledge Q&A.
2. Inspect the pinned source, README, research engine, provider adapter, knowledge index and tests.
3. Reproduce the fixture suite without contacting paid providers or modifying the live notebook.
4. Author twelve sections and three accessible diagrams using the existing article components.
5. Register metadata, article route and discovery through the shared RSS/sitemap registry.
6. Run the existing article metadata checks, typecheck, static export and browser acceptance.
7. Publish through the existing GitHub checks and automatic Render deployment.

## Verified evidence

Local and remote main identify commit `58113f8`. No PRs or hosted workflow runs were returned by
the repository audit. Publication independently reproduced 39 fixture tests, including four HTTP
tests with loopback networking enabled. Both browser JavaScript files passed Node syntax checks.
No live Brave requests or Ollama inference were triggered for this publication.

The conversation reports nine saved notes preserved during the upgrade, 27 embedded passages,
two successful live knowledge answers with exact citation matches, and seven retrieved graph
connections in one answer. It also records successful extraction after the endpoint-schema fix,
with remaining graph indexing continuing in the background. These observations are attributed to
the implementation session rather than presented as a new publication benchmark.

## Technical narrative

- Continuous planning → research → briefing with researcher question priority and cooperative pause.
- Brave single-search Answers calls; local Qwen structured planning, synthesis and extraction.
- SQLite research state with generated Markdown/JSON exports and a separate knowledge database.
- Exact passages, FTS5/BM25, cached local embeddings and two-hop evidence-graph traversal.
- Reciprocal-rank fusion with at most 12 passages and an 18,000-character context budget.
- Immutable excerpt selection fixes model quotation drift; typed relation endpoints prevent
  dangling concept names.
- Saved answer snapshots preserve citations after reindexing.
- Local-only knowledge questions and an explicit “Research this gap” handoff to collection.

## Claim boundaries

The article explains that saved Brave summaries are secondary evidence and original webpages are
not independently ingested. Exact citation matching proves provenance, not entailment or truth.
No community/global synthesis, semantic entity merging, multi-user hosting, measured retrieval
quality, load capacity or latency benchmark is claimed. The published note contains no private
research content or credentials.

## Publication

Published from website commit `18227e1877c829147965307e817a242544f402da`.
CI `34414296023` and CodeQL `34414296166` passed. Render Static Site deployment
`dep-dagu7kc9v7es7381qrug` succeeded at 2026-09-09 22:57:40 UTC.

The article, index, RSS feed and sitemap returned successfully and contained the new slug.
The article includes BlogPosting structured data, the pinned R3N commit and verified test count.
Local static-export validation passed for all 18 Build Notes. Browser inspection confirmed three
readable diagrams and a 390-pixel document width with no page-level horizontal overflow.
TypeScript, lint and the existing article metadata/rendering suite passed before publication.
