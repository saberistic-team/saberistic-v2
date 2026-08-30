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

## Verification record before deployment

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

## Deployment and live acceptance plan

1. Run the full repository verification suite, including Payload and fixture Static Site production
   builds.
2. Commit and push the reviewed change to `main`.
3. Wait for GitHub checks and Render's checks-gated Static Site deployment. Do not mark the work live
   from a successful local build.
4. Verify the apex icon, brand image, manifest, robots, sitemap, route canonicals, JSON-LD, security
   headers, equivalent legacy redirects, real 404 behavior, and current prototype snapshot.
5. Rerun mobile and desktop Lighthouse against the live CDN and record category scores and Web
   Vitals. The minimum target is 95 performance and 100 accessibility/best-practices/SEO on a clean
   representative run, with CLS at or below 0.1. Investigate run variance rather than hiding it.
6. Confirm a new supported-browser performance row carries `cls: 0` when no shift occurs. Leave old
   rows intact and monitor p75 after enough new visits or after the 24-hour window rolls forward.

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
