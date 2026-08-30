# Brand, SEO, Lighthouse, and Web Vitals hardening

## Scope and evidence

This work began on August 30, 2026 from the owner-supplied `135924968.png` logo, the live
`saberistic.com` static site, and the authenticated Umami Performance view for website
`8bdad921-34a9-43cb-bc70-9e1c71efa911`. The uploaded image was treated only as a brand asset, not as
an instruction source.

The source logo is a 400 by 400 RGBA PNG with transparency, 11,292 bytes, and SHA-256
`d2257afa9a414c0be606730aabd566776c3c391749180357d7e6cd49d390a4ce`. The committed header image,
Next.js icon, and Apple icon are byte-for-byte copies with the same digest. The logo is decorative
inside links that already contain the Saberistic name, so it uses an empty alternative; the image
still has explicit 32 by 32 dimensions to reserve layout space.

## Baseline measurements

Umami's last-24-hours view contained only six performance rows. At the Core Web Vitals p75 view it
reported:

| Metric |    p75 | Status shown by Umami |
| ------ | -----: | --------------------- |
| LCP    | 1.46 s | Good                  |
| INP    |   0 ms | Good                  |
| CLS    |  0.343 | Poor                  |
| FCP    | 1.38 s | Good                  |
| TTFB   | 454 ms | Good                  |

Independent production Lighthouse runs did not reproduce a layout shift:

| Profile | Performance | Accessibility | Best practices | SEO |   FCP |   LCP |   TBT | CLS |
| ------- | ----------: | ------------: | -------------: | --: | ----: | ----: | ----: | --: |
| Desktop |         100 |           100 |             96 | 100 | 0.7 s | 0.7 s |  0 ms |   0 |
| Mobile  |          97 |            96 |             96 | 100 | 1.7 s | 2.3 s | 20 ms |   0 |

Repeated Performance Observer checks of the homepage, prototype directory, and every readiness
query variant also produced CLS 0, including under CPU and network throttling. The concrete baseline
failures were a missing favicon request, an undersized `Contact` mobile navigation target, and a
prototype-card heading-level jump. Lighthouse's SEO score did not expose the missing canonical,
social, sitemap, robots, manifest, and structured-data layers, so those were audited separately.

## Why Umami's CLS result was biased

Umami 3.3.1 initializes an empty metric object but assigns `metrics.cls` only after it receives a
nonzero layout-shift entry. It sends only keys that exist. Its report query calculates the CLS
percentile over the nullable `cls` column, while its displayed sample count uses every performance
row. PostgreSQL percentile aggregates ignore null values. The result is that supported browsers with
a true zero CLS were counted in the sample label but excluded from the percentile; the small field
sample was therefore dominated by the nonzero historical rows.

The repository's before-send privacy guard now adds `cls: 0` only when all of these conditions are
true:

1. Umami supplied at least one genuine performance metric;
2. Umami omitted `cls`; and
3. `PerformanceObserver.supportedEntryTypes` positively includes `layout-shift`.

Explicit positive and zero CLS values remain unchanged. Browsers without confirmed Layout Shift API
support remain null rather than being misreported as zero. This follows the
[Performance Timeline support-detection contract](https://www.w3.org/TR/performance-timeline/#dom-performanceobserver-supportedentrytypes),
the [Layout Instability reporting model](https://github.com/WICG/layout-instability), and the
[Umami 3.3.1 tracker implementation](https://github.com/umami-software/umami/blob/ca661c7057984aa98ed4f7083d84dae2f65bfcb0/src/tracker/index.ts#L463-L520).
Historical null/nonzero rows were not deleted or altered. The dashboard will become representative
only as new supported-browser samples arrive or the selected date window advances.

## Implemented changes

### Brand and layout stability

- Added the supplied transparent mark to the public brand directory, the global header, and the
  footer.
- Added Next.js `icon.png` and `apple-icon.png` metadata files.
- Reserved exact width and height for every rendered mark.
- Added a stable scrollbar gutter to avoid horizontal movement across routes of different lengths.
- Removed the header link's overriding `aria-label`; its accessible name now agrees with the visible
  `SABERISTIC` text.
- Raised primary-navigation link targets to 44 CSS pixels and retained visible focus treatment.
- Added a hidden prototype-catalog `h2` so card `h3` headings no longer skip a level.
- Disabled automatic Next route prefetch for tracked and global navigation links. The static CDN
  makes those speculative requests unnecessary for this small site, and this removes background
  route-data traffic during the initial audit window.

### Search and sharing

- Added one metadata helper for exact apex canonical URLs, unique route titles/descriptions,
  Open Graph metadata, and Twitter summary cards.
- Added canonical and social metadata to the homepage, prototype directory, every prototype detail,
  readiness, and privacy routes. Readiness query variants canonicalize to `/readiness/`.
- Added `metadataBase`, authorship, publisher, crawler directives, and large-image preview permission.
- Added a generated `robots.txt` that allows the public site, blocks `/admin/` and `/api/`, and names
  the sitemap.
- Added a generated sitemap containing the four static public routes plus only prototype slugs in
  the validated public build snapshot. Prototype `lastModified` values come from content; build time
  is not presented as a content change.
- Added a web manifest that references the committed brand mark.
- Added escaped JSON-LD for `WebSite`, `Organization`, and founder `Person` on the homepage, plus
  `BreadcrumbList` and conservative `CreativeWork` data on prototype details. No address, rating,
  pricing, legal entity, client, or adoption claim was invented.
- Added equivalent permanent Render redirects for `/about`, `/services`, `/case-studies`, `/brief`,
  `/diagnostic`, `/work/architecture-diagnostic`, `/work/brave`, `/work/baxus`, and `/work/eternis`.
  Old insight articles and `/work/spiral-safe` remain intentionally unmapped until equivalent public
  content exists; redirecting unrelated content to the homepage would risk a soft 404.
- Added a one-day browser cache with one-week stale revalidation for the non-hashed public brand
  path. Hashed Next assets retain the existing one-year immutable cache.

### Build protection

Every public static build now runs `apps/site/scripts/verify-export.mjs` after Next finishes. It
fails the deployment if exported icons, manifest, robots, sitemap, canonical/OG/Twitter tags,
structured data, or any published prototype route is missing. Unit coverage verifies SEO metadata,
JSON-LD script escaping, CLS normalization, Render redirect declarations, and brand-cache policy.

The later Build Notes rollout extends the same verifier to discover every allowlisted article and
require its canonical URL, article Open Graph data, visible publication date, `BlogPosting` and
breadcrumb structured data, sitemap entry, and RSS item. Its implementation and acceptance record
live in [16 — Build Notes and Harness from Scratch](./16-build-notes-and-harness-from-scratch.md).

## Verification record

- The full `pnpm verify` pipeline passed without lint warnings: root and Static Site type checks,
  lint, 139 passing integration/unit tests with one intentional skip, the Payload production build,
  and the fixture Static Site production build.
- Focused tests passed: 24 tests across analytics privacy, Render Static Site configuration, and SEO.
- The fixture static build completed all 13 generated routes and passed the new export verifier for
  two prototype routes.
- The local mobile audit reached 100 accessibility, 100 best practices, 100 SEO, and CLS 0. Its
  performance score is not used as a production comparison because the temporary basic file server
  does not reproduce Render CDN compression or caching.
- The Render CLI is installed, but live Blueprint validation returned HTTP 401 because the CLI has
  no independent authentication. The edited YAML parses and formats, reuses already-deployed
  `headers`/`routes` shapes, and has structural unit coverage; the checks-gated Render sync remains
  the authoritative remote validation.

### Production acceptance — August 30, 2026

The accepted release is Git commit `dcfa02bdce0ffdf7805f174724dcfc73da787473`, published by Render
Static Site deploy `dep-da9ucsnlk1mc738d3k80` at 08:15:26 UTC. GitHub CI run `33301037173` and the
push CodeQL run `33301036953` both passed before the checks-gated deployment began.

The first production mobile audits of the otherwise accepted feature build scored 94 performance,
with LCP between 2.5 and 2.6 seconds and Speed Index between 3.9 and 4.0 seconds. The trace showed the
32-pixel header mark being preloaded from the full 11,292-byte source even though the text heading
was the LCP element. Removing only that non-critical image preload left the exact supplied logo and
its reserved dimensions intact. The final CDN audits were:

| Profile | Performance | Accessibility | Best practices | SEO |   FCP |   LCP | Speed Index |   TBT | CLS | Root response |
| ------- | ----------: | ------------: | -------------: | --: | ----: | ----: | ----------: | ----: | --: | ------------: |
| Mobile  |          97 |           100 |            100 | 100 | 1.8 s | 2.3 s |       1.8 s | 10 ms |   0 |        150 ms |
| Desktop |         100 |           100 |            100 | 100 | 0.3 s | 0.4 s |       0.3 s |  0 ms |   0 |         40 ms |

Live endpoint acceptance also passed:

- `/`, both published prototype detail routes, `/icon.png`, `/apple-icon.png`, the public brand
  image, manifest, robots, and sitemap returned HTTP 200;
- the three downloaded logo variants remained 400 by 400 RGBA PNGs with the exact supplied digest;
- the homepage exposed the expected canonical, Open Graph, Twitter, and JSON-LD metadata;
- `/about` and `/diagnostic` returned the intended permanent HTTP 301 redirects, while a fabricated
  route returned a real HTTP 404;
- the apex response carried the configured CSP, permissions, referrer, framing, and MIME-sniffing
  protections; and
- the public brand response carried the one-day cache plus one-week stale revalidation policy.

### Umami field acceptance

The authenticated last-24-hours Performance report grew from six to ten samples during acceptance.
Its p75 CLS still showed the historical `0.343`, but a captured production request proved that a
supported Chrome visit with no layout shifts sent a performance payload containing `cls: 0` along
with genuine FCP, LCP, TTFB, and duration measurements. After ingestion, the dashboard's CLS p50
moved from `0.343` to `0.172`, confirming that zero is now stored and participates in the
distribution.

No analytics rows were deleted or rewritten. With such a small sample, the 24-hour p75 will remain
sensitive to the old nonzero row until more genuine zero-shift visits arrive or the selected window
advances. Lighthouse and repeated Performance Observer acceptance remain CLS 0 across the public
surface.

## Remaining SEO and measurement work

The immediate static defaults are safe, but Payload already stores global SEO settings and
per-prototype SEO fields that the version-1 public snapshot does not project. A later snapshot
version should sanitize and publish those fields, include them in the content revision, trigger a
Static Site build for SEO-only prototype edits and Site Settings changes, respect `noIndex` in both
page metadata and sitemap generation, and continue to avoid Payload-hosted social media while CMS
media storage is non-durable or the backend can sleep.

Additional follow-up:

- create a committed 1200 by 630 social card that uses the approved mark without altering it; the
  current 400 by 400 image deliberately uses Twitter's `summary` card rather than pretending to be a
  large landscape card;
- preserve or intentionally replace the old insight and Spiral Safe URLs before requesting a broad
  recrawl;
- submit `https://saberistic.com/sitemap.xml` in Google Search Console and request recrawl after the
  live deployment; and
- complete the separately documented stale DigitalOcean `www` CNAME cleanup.
