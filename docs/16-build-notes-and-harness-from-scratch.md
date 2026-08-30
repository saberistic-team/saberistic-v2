# Build Notes and “Harness from Scratch” implementation

## Outcome

Saberistic now has a Git-authored development journal at `/build-notes/`. The first entry,
`/build-notes/harness-from-scratch/`, converts the owner-supplied 11,147-line Pi session note into a
structured, source-linked technical article.

The public implementation includes:

- a Build Notes index and statically enumerated detail route;
- homepage, primary-navigation, and footer discovery;
- an RSS 2.0 feed at `/build-notes/feed.xml`;
- article Open Graph metadata, canonical URLs, `BlogPosting` and breadcrumb JSON-LD, dates, tags,
  sitemap entries, and a visible source/provenance section;
- eleven labeled code blocks and four accessible inline SVG diagrams;
- a sticky desktop table of contents and a one-column mobile reading layout;
- strict, low-cardinality Umami events for note cards, article views, and repository links; and
- static-export verification that discovers every published note and checks its HTML, metadata,
  structured data, sitemap entry, and RSS item.

## Source material and evidence boundary

The article was prepared from two distinct sources:

1. The attached local Pi transcript supplies chronology: the bootstrap prompt, commands, failures,
   fixes, reported outputs, and the use of Pi v0.84.4 with the model label `qwen3.8:27b` through
   `ollama launch pi`.
2. The public repository supplies the durable implementation state. Claims and links are pinned to
   commit `88ef2f4030ea7cb07a7d183032dc23a43eea734e` rather than to a moving branch.

The transcript did not show a remote push. The public repository was therefore cloned and audited
independently instead of assuming that its state matched the local session.

At the pinned commit, the audit found:

| Evidence                         | Verified state           |
| -------------------------------- | ------------------------ |
| Tracked files                    | 73                       |
| Lines excluding `pnpm-lock.yaml` | 3,847                    |
| Public commits                   | 4                        |
| Public branches                  | `main` only              |
| Tags                             | none                     |
| Test files                       | 6                        |
| Tests                            | 40 passing               |
| TypeScript                       | strict type check passes |
| Task contract                    | `kernel-0001` validates  |

The repository checks were rerun from a fresh clone. The CLI tests create temporary Git
repositories; the developer machine globally enables signed commits, so verification disabled that
inherited setting for only those fixtures. No repository file was changed. With that environmental
isolation, all 40 tests passed.

## Editorial handling of the Pi transcript

Pi was the coding harness operating the session; Qwen was the selected model producing proposed
actions; Ollama supplied the model provider/configuration path. The generated repository is their
output but does not depend on Pi, Qwen, or Ollama. Its only implemented model backend is the
deterministic `FakeModel`.

The article summarizes observable work rather than reproducing the model's internal deliberation.
It preserves the parts that help a reader reproduce or evaluate the result:

- the original architecture inspiration map;
- the scoped M0 exit condition;
- the monorepo shape;
- the full `kernel-0001` YAML contract;
- the event envelope and ordered decoder gates;
- the FakeModel and kernel-loop behavior;
- the dirty-path policy gate and structured report;
- the strongest debugging lessons; and
- a working-versus-roadmap table.

## Factual claim holds

The article deliberately does **not** describe M0 as a complete agent platform. The following limits
are public because they materially change how the code should be trusted:

- OpenCode, Goose, and OpenHands are mental-model references, not imported integrations.
- The CLI exit gate does not run Pi, Ollama, Qwen, `runAgent`, or any coding tool. It evaluates an
  existing working tree.
- `allowed_paths` currently evaluates modified, staged, and untracked paths from `git status`; it
  does not compare the committed task branch with a base branch.
- The final passing transcript report had no changed paths. It proves policy/test/report plumbing,
  not autonomous implementation of `kernel-0001` from the manifest.
- `goal`, `acceptance`, `budget`, network denial, Git denial, and delivery validate as contract data
  but do not all drive or isolate CLI execution.
- Headless `ask` is not yet enforced as a stop by the CLI; only `deny` blocks the test command.
- Workspace scoping and the read-file tool are separate surfaces, and the sandbox runner is a
  `ready: false` placeholder. This is not an untrusted-code isolation boundary.
- Sessions are in memory. SQLite, Postgres, S3/MinIO storage, OpenTelemetry, Kubernetes, live MCP,
  and live ACP remain roadmap work.
- The TUI, web app, agent server, control plane, and sandbox runner are placeholders.
- Run reports are local and Git-ignored. No report, task branch, or pull request is published in the
  repository; the current report `pullRequest` field contains a branch label rather than a URL.
- The event timestamp field currently accepts a non-empty string rather than parsing ISO-8601, and
  raw-input preservation is narrower than the events documentation implies.

These constraints are not footnotes to remove later. They are part of Saberistic's evidence-first
publishing standard.

## Why Build Notes are Git-authored in v1

ADR-014 normally assigns editorial content to Payload. Build Notes are a narrow exception because
their code excerpts, diagrams, file paths, commits, and limitations are code-adjacent evidence. They
need to change atomically with the route and renderer that explain them.

Git-authored typed TSX was selected over a new Payload collection or MDX because it provides:

- no version-1 public-snapshot schema change or backend/static deployment race;
- explicit review and history for factual changes;
- safe React-owned SVG rather than CMS-authored executable markup;
- rich code, table, file-guide, callout, and diagram composition without a new dependency;
- build-time slug enumeration and a permanent CDN artifact; and
- one explicit publish allowlist rather than a filesystem scan that could expose drafts.

No MDX package was added. If daily cadence makes TSX authoring materially painful, MDX can be
evaluated with both Next applications and their required component boundaries. It should not be
introduced only to make the first post look blog-like.

## Static architecture

The route implementation stays in the shared frontend layer and is re-exported by the static app:

```text
src/
├── app/(frontend)/build-notes/
│   ├── page.tsx
│   ├── [slug]/page.tsx
│   └── feed.xml/route.ts
├── components/build-notes/
│   ├── ArticlePrimitives.tsx
│   ├── BuildNoteCard.tsx
│   └── HarnessDiagrams.tsx
├── content/build-notes/
│   └── HarnessFromScratch.tsx
└── lib/
    ├── build-notes.ts
    └── build-notes-feed.ts

apps/site/src/app/build-notes/
├── page.tsx
├── [slug]/page.tsx
└── feed.xml/route.ts
```

`src/lib/build-notes.ts` is the explicit publish manifest. Each entry contains a unique kebab-case
slug, publication/modification dates, reading time, tags, repository URL, and pinned commit. The
static detail wrapper returns every manifest slug from `generateStaticParams()` and sets
`dynamicParams = false`, so Render receives a real directory per article and unknown slugs remain
404s.

The content component map is also explicit. Adding a manifest item without a corresponding content
component cannot silently expose a raw file.

### Operational nuance

A Git-authored note removes a note-content snapshot race, but `pnpm build:site` still fetches the
prototype snapshot from Payload before every build. A sleeping Payload service can therefore delay
or fail a note deployment. Render retains the last successful CDN artifact, so this cannot take the
current public article down.

The Payload service currently imports the shared frontend and has no note-specific build filter.
Do not add an ignore rule yet: a note commit should keep the Payload fallback routes consistent. If
daily cadence makes double deployment noisy, first formalize Build Notes as static-app-only, then
introduce a narrowly tested Payload build filter.

## Accessible article primitives

Code blocks use `<figure>`, a visible caption/language label, and a focusable horizontal `<pre>`
region. They render escaped plain text and add no syntax-highlighting or copy-button JavaScript.

Every diagram is an inline SVG inside a `<figure>` and has:

- `role="img"`;
- a unique `<title>` and `<desc>` connected through `aria-labelledby`;
- a responsive `viewBox`;
- visible text labels and shapes, so meaning does not depend on color; and
- an adjacent prose caption that states what is implemented versus aspirational.

The four diagrams cover the inspiration layers, task-contract fan-out, local kernel sequence, and
blocked-to-passed dogfooding timeline.

The responsive QA found no document-level horizontal overflow at 1280 px or 390 px. The mobile
header was changed from sticky to normal flow so a wrapped navigation does not consume a large
fraction of the reading viewport. The smallest breakpoint lays navigation links out in two balanced
rows of three.

## SEO and discovery

The implementation adds:

- exact canonical URLs for the index and detail route;
- Open Graph `article` type with published/modified dates and tags;
- Twitter summary metadata through the existing brand image;
- `BlogPosting` and `BreadcrumbList` JSON-LD through the existing safe serializer;
- visible `<time datetime>` publication markup;
- a weekly Build Notes index and monthly article entries in `sitemap.xml`;
- an RSS 2.0 feed containing only manifest-published notes; and
- homepage, primary-navigation, and footer links.

The existing 400×400 brand mark remains the social image. A future 1200×630 article-specific image
should be added only when a real asset exists; metadata must not invent one.

Prototype records are no longer called “build notes” in empty or unavailable-state copy. “Prototype
record” now describes CMS prototype content; “Build Note” describes the journal taxonomy.

## Analytics and privacy

Build Notes add three versioned events:

| Event                       | Exact fields                         | Purpose                    |
| --------------------------- | ------------------------------------ | -------------------------- |
| `build_note_card_clicked`   | `note`, `placement: home` or `index` | Discoverability by surface |
| `build_note_view`           | `note`                               | Article opens              |
| `build_note_source_clicked` | `note`                               | Repository follow-through  |

The note value must be a slug in the published Build Notes manifest. Scroll depth, section names,
code contents, tags, source URLs, query strings, fragments, and arbitrary titles are not
custom-event fields.

The privacy path guard now allows the Build Notes index and one slug segment. It also normalizes one
canonical trailing slash before applying the strict path allowlist. This fixes a pre-existing issue
where exported URLs such as `/privacy/`, `/readiness/`, and `/prototypes/backthen/` could be rejected
even though their slashless equivalents were allowed. Private, nested draft, malformed, and
near-prefix routes remain blocked.

The public privacy page now names Build Note opens and repository follows as measured interactions
and states that the articles work when analytics is unavailable or blocked.

## Verification contract

The implementation is accepted only when all of the following pass:

1. Root and static-app TypeScript checks.
2. ESLint.
3. Unit/integration tests, including:
   - manifest uniqueness, chronology, dates, commit shape, and summary bound;
   - article rendering, labeled focusable code, four accessible SVGs, and explicit limitations;
   - RSS entries for every published note;
   - article Open Graph metadata;
   - accepted and rejected Build Note analytics events; and
   - trailing-slash and Build Note privacy paths.
4. Fixture static export.
5. Export verifier requirements for:
   - index and detail canonicals;
   - `og:type=article` and published-time metadata;
   - `BlogPosting` and breadcrumb JSON-LD;
   - visible publication time;
   - sitemap coverage; and
   - RSS coverage.
6. Visual QA at desktop and phone widths, including code and diagram sections and zero document
   overflow.
7. A remote static build against the live Payload snapshot before deployment.
8. Live route, metadata, RSS, analytics, console, responsive, and Lighthouse checks after Render
   publishes the commit.

### Pre-deployment verification — August 30, 2026

The complete local `pnpm verify` release pipeline passed:

- root and Static Site TypeScript checks;
- ESLint without warnings;
- 149 tests passing with one intentional skip across 18 passing and one skipped test file;
- the Payload production build; and
- a 16-page fixture Static Site export whose verifier found one Build Note and two prototype routes.

A separate production-mode Static Site build woke the sleeping Payload service, fetched public
content revision `5cd17cdaa03c`, exported the same 16 routes, and passed every static verifier. It did
not use fixture or empty fallback content.

Browser QA of the exported article found one `h1`, 15 article sections (14 linked in the table of
contents), 11 labeled code blocks, four accessible diagrams, no console warnings/errors, and zero
document-level horizontal overflow at both 390-pixel phone width and the desktop application
viewport. Seven long code blocks scroll inside their own focusable regions on the phone. The mobile
header is normal document flow, and its six navigation links form two balanced rows of three.

Local Lighthouse results were:

| Profile | Performance | Accessibility | Best practices | SEO |   FCP |   LCP |   TBT | CLS |
| ------- | ----------: | ------------: | -------------: | --: | ----: | ----: | ----: | --: |
| Mobile  |          84 |           100 |            100 | 100 | 1.5 s | 4.5 s | 10 ms |   0 |
| Desktop |          99 |           100 |            100 | 100 | 0.3 s | 0.9 s |  0 ms |   0 |

The mobile performance number is not a production acceptance result. The temporary Python file
server uses HTTP/1.0 and serves the 134 KB article HTML plus shared assets without Render CDN
compression or cache headers; Lighthouse identified the text `h1` as the LCP element and measured
only about 117 ms of element render delay. Production CDN Lighthouse is therefore the release
measurement. Accessibility, best-practice, SEO, and CLS gates already pass independently of that
serving difference.

### Production acceptance — August 30, 2026

The accepted release is Git commit `d92e6354b566e5c35a16afc4c732c1ed12765ff0`. GitHub CI run
`33306651976` and CodeQL run `33306651627` passed before Render's checks-gated deployment began.
Render Static Site deploy `dep-daa0dqgu01pc73dd3vlg` became live at 10:33:54 UTC.

External endpoint checks returned:

| URL                                                        | Result                                               |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| `https://saberistic.com/`                                  | `200` HTML with homepage Build Notes discovery       |
| `https://saberistic.com/build-notes/`                      | `200` HTML with exact RSS autodiscovery link         |
| `https://saberistic.com/build-notes/harness-from-scratch/` | `200` article HTML                                   |
| `https://saberistic.com/build-notes/feed.xml`              | `200 application/xml`                                |
| `https://saberistic.com/sitemap.xml`                       | `200 application/xml` with index and article entries |
| `/build-notes/not-published/`                              | real `404`                                           |

Live phone-width browser acceptance confirmed the 58-character search title, exact canonical,
Open Graph article type, `BlogPosting` structured data, one `h1`, 15 article sections, 11 code
blocks, four diagrams, zero horizontal overflow, normal-flow mobile header, and balanced navigation.
The Umami script loaded from `umami.saberistic.com` with the configured website ID and exact apex/
`www` domain allowlist. No browser warning or error was recorded.

Three independent production mobile Lighthouse runs scored 94, 100, and 99 for performance. The
median result is recorded instead of selecting the fastest run:

| Profile       | Performance | Accessibility | Best practices | SEO |    FCP |    LCP | Speed Index |  TBT | CLS |
| ------------- | ----------: | ------------: | -------------: | --: | -----: | -----: | ----------: | ---: | --: |
| Mobile median |          99 |           100 |            100 | 100 | 1.03 s | 2.21 s |      1.03 s | 8 ms |   0 |
| Desktop       |         100 |           100 |            100 | 100 |  0.3 s |  0.5 s |       0.3 s | 0 ms |   0 |

The first mobile run was slower than the two repetitions but still remained in Lighthouse's green
performance range and retained CLS 0. No production change was made by choosing a favorable trace;
the median above represents the run-to-run result.

## Adding the next Build Note

1. Create a reviewed content component under `src/content/build-notes/` using the existing article
   primitives. Do not paste executable raw HTML or third-party SVG.
2. Add one manifest item to `src/lib/build-notes.ts`, newest first. Use a permanent slug; changing it
   after publication requires a redirect and sitemap/RSS review.
3. Add the component to the explicit detail-page component map.
4. Use primary repository or official project links, pin material code claims to a commit, and add a
   public “working now versus next” boundary when the project is incomplete.
5. Add diagrams only when they explain a relationship more clearly than prose. Give each SVG unique
   title/description IDs and ensure it works without color.
6. Run the complete verification contract.
7. Push through the normal reviewed branch. Render builds a new atomic static artifact; the previous
   artifact remains live if the build fails.

## Payload-backed future option

Payload remains the appropriate future authoring surface if non-developer editing becomes a real
requirement. That change must use a backend-first versioned rollout:

1. Add a `BuildNotes` collection with drafts, versions, publication review, SEO, and typed blocks.
2. Permit only safe block types such as prose, code text, file lists, callouts, and a Git-owned
   diagram identifier. Never accept executable JSX or raw SVG from Payload.
3. Add a strict public projection to `/api/public/site-snapshot/v2`; keep `/v1` unchanged.
4. Deploy the backend and verify v2 before switching the static consumer.
5. Derive the index, homepage latest note, sitemap, and detail routes from the same validated v2
   snapshot.
6. Trigger Render builds on publish, unpublish, delete, and relevant public-field changes.
7. Remove the Git manifest only after all published notes are migrated and rollback to the old static
   consumer has been tested.

Until that workflow is justified, Git-authored notes are the accepted production design.

## Primary references

- Harness Platform pinned tree:
  `https://github.com/saberistic-team/harness-platform/tree/88ef2f4030ea7cb07a7d183032dc23a43eea734e`
- Ollama Pi integration: `https://docs.ollama.com/integrations/pi`
- Pi: `https://github.com/earendil-works/pi`
- OpenCode: `https://github.com/anomalyco/opencode`
- Goose: `https://github.com/aaif-goose/goose`
- OpenHands: `https://github.com/OpenHands/OpenHands`
