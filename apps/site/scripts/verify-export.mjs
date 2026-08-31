import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const siteRoot = path.resolve(dirname, '..')
const outputRoot = path.join(siteRoot, 'out')
const snapshotPath = path.join(siteRoot, '.generated/public-content.json')
const cryptopalVideoPath = 'media/build-notes/cryptopal/cryptopal-private-transfer.cafb08d2.mp4'
const cryptopalPosterPath =
  'media/build-notes/cryptopal/cryptopal-private-transfer-poster.b9a20494.webp'

async function readOutput(relativePath) {
  return readFile(path.join(outputRoot, relativePath), 'utf8')
}

function assertPageMetadata(html, canonical, type = 'website') {
  assert.match(html, new RegExp(`<link rel="canonical" href="${canonical}"`))
  assert.match(html, /<meta property="og:title" content="[^"]+"/)
  assert.match(html, new RegExp(`<meta property="og:type" content="${type}"`))
  assert.match(html, new RegExp(`<meta property="og:url" content="${canonical}"`))
  assert.match(
    html,
    /<meta property="og:image" content="https:\/\/saberistic\.com\/brand\/saberistic-mark\.png"/,
  )
  assert.match(html, /<meta name="twitter:card" content="summary"/)
  assert.match(
    html,
    /<meta name="twitter:image" content="https:\/\/saberistic\.com\/brand\/saberistic-mark\.png"/,
  )
}

const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'))
const homepage = await readOutput('index.html')

assertPageMetadata(homepage, 'https://saberistic.com/')
assert.match(homepage, /<link rel="icon" href="\/icon\.png\?[^" ]+"/)
assert.match(homepage, /<link rel="apple-touch-icon" href="\/apple-icon\.png\?[^" ]+"/)
assert.match(homepage, /<link rel="manifest" href="\/manifest\.webmanifest"/)
assert.match(homepage, /id="homepage-structured-data" type="application\/ld\+json"/)
assert.match(homepage, /class="wordmark__mark"/)
assert.match(homepage, /width="32" height="32"/)
assert.match(
  homepage,
  /<a href="https:\/\/www\.linkedin\.com\/in\/saberistic\/" rel="me">LinkedIn — AmirSaber<\/a>/,
)
assert.match(
  homepage,
  /"sameAs":\["https:\/\/github\.com\/saberistic","https:\/\/www\.linkedin\.com\/in\/saberistic\/"\]/,
)

for (const [relativePath, canonical] of [
  ['build-notes/index.html', 'https://saberistic.com/build-notes/'],
  ['privacy/index.html', 'https://saberistic.com/privacy/'],
  ['prototypes/index.html', 'https://saberistic.com/prototypes/'],
  ['readiness/index.html', 'https://saberistic.com/readiness/'],
]) {
  assertPageMetadata(await readOutput(relativePath), canonical)
}

const buildNotesIndex = await readOutput('build-notes/index.html')
assert.match(
  buildNotesIndex,
  /<link rel="alternate" type="application\/rss\+xml" href="https:\/\/saberistic\.com\/build-notes\/feed\.xml"/,
)
const buildNoteSlugs = [
  ...new Set(
    [...buildNotesIndex.matchAll(/href="\/build-notes\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?"/g)].map(
      (match) => match[1],
    ),
  ),
]

assert.ok(buildNoteSlugs.length > 0)
for (const slug of buildNoteSlugs) {
  const canonical = `https://saberistic.com/build-notes/${slug}/`
  const html = await readOutput(`build-notes/${slug}/index.html`)

  assertPageMetadata(html, canonical, 'article')
  assert.match(html, /<meta property="article:published_time" content="[^"]+"/)
  assert.match(html, /type="application\/ld\+json"/)
  assert.match(html, /"@type":"BlogPosting"/)
  assert.match(html, /"@type":"BreadcrumbList"/)
  assert.match(html, /<time dateTime="\d{4}-\d{2}-\d{2}"/)
}

const cryptopal = await readOutput('build-notes/cryptopal-wallet-email-wallet/index.html')
assert.match(cryptopal, /<video[^>]*aria-label="CryptoPal local private-transfer walkthrough"/)
assert.match(cryptopal, /<video[^>]*controls=""/)
assert.match(cryptopal, /<video[^>]*playsInline=""/)
assert.match(cryptopal, /<video[^>]*preload="none"/)
assert.match(cryptopal, new RegExp(`poster="/${cryptopalPosterPath}"`))
assert.match(cryptopal, new RegExp(`<source src="/${cryptopalVideoPath}" type="video/mp4"`))
assert.match(cryptopal, /Visual transcript for the silent recording/)
assert.match(cryptopal, /The run selects that exact message in the local Mailpit inbox/)
assert.match(cryptopal, /"@type":"VideoObject"/)
assert.match(cryptopal, /"duration":"PT3M20S"/)
assert.match(
  cryptopal,
  new RegExp(`"contentUrl":"https://saberistic.com/${cryptopalVideoPath.replaceAll('/', '\\/')}"`),
)
assert.doesNotMatch(cryptopal, /<video[^>]*(?:autoplay|loop)/)

const growthProgram = await readOutput('build-notes/growth-program-v2-scorecards/index.html')
assert.match(
  growthProgram,
  /Growth Program v2: replacing a live score contract without mutating it/,
)
assert.match(growthProgram, /d944ee7/)
assert.match(growthProgram, /href="#browser-demo"/)
assert.match(growthProgram, /href="#local-validator"/)
assert.match(
  growthProgram,
  /implemented and locally validated\. It is not deployed or release-ready\./,
)
assert.match(growthProgram, /issuer-attested, multi-pillar scorecard and credential primitive/)
assert.match(growthProgram, /none becomes a V2 score/)
assert.match(growthProgram, /no RPC, wallet, signing, transaction sending/)
assert.match(growthProgram, /genesis-loads the exact binary/)

const harnessM2 = await readOutput('build-notes/harness-eval-credibility-m2/index.html')
assert.match(harnessM2, /Harness Platform M2: making evaluation evidence credible/)
assert.match(harnessM2, /8f18f6d/)
assert.match(harnessM2, /href="#golden-repository"/)
assert.match(harnessM2, /href="#telemetry"/)
assert.match(harnessM2, /href="#mcp-stdio"/)
assert.match(harnessM2, /123 \/ 123/)
assert.match(harnessM2, /7 \/ 7/)
assert.match(harnessM2, /13 tools/)
assert.match(harnessM2, /Telemetry is fully off unless the operator opts in/)
assert.match(harnessM2, /that CLI sequence currently creates no spans or counters/)
assert.match(harnessM2, /never runs in the default pull-request or push lane/)
assert.match(harnessM2, /2025-11-25/)
assert.match(harnessM2, /2026-07-28/)
assert.match(harnessM2, /future compatibility adapter/)

for (const prototype of snapshot.prototypes.items) {
  const canonical = `https://saberistic.com/prototypes/${prototype.slug}/`
  const html = await readOutput(`prototypes/${prototype.slug}/index.html`)

  assertPageMetadata(html, canonical)
  assert.match(html, /type="application\/ld\+json"/)
  assert.match(html, new RegExp(`"url":"${canonical}"`))
}

const robots = await readOutput('robots.txt')
assert.match(robots, /User-Agent: \*/)
assert.match(robots, /Disallow: \/admin\//)
assert.match(robots, /Disallow: \/api\//)
assert.match(robots, /Sitemap: https:\/\/saberistic\.com\/sitemap\.xml/)

const sitemap = await readOutput('sitemap.xml')
for (const canonical of [
  'https://saberistic.com/',
  'https://saberistic.com/build-notes/',
  'https://saberistic.com/privacy/',
  'https://saberistic.com/prototypes/',
  'https://saberistic.com/readiness/',
  ...snapshot.prototypes.items.map(
    (prototype) => `https://saberistic.com/prototypes/${prototype.slug}/`,
  ),
  ...buildNoteSlugs.map((slug) => `https://saberistic.com/build-notes/${slug}/`),
]) {
  assert.match(sitemap, new RegExp(`<loc>${canonical}</loc>`))
}
assert.doesNotMatch(sitemap, /\/admin|\/api/)

const rss = await readOutput('build-notes/feed.xml')
assert.match(rss, /<rss version="2\.0"/)
assert.match(rss, /<title>Saberistic Build Notes<\/title>/)
for (const slug of buildNoteSlugs) {
  assert.match(rss, new RegExp(`<link>https://saberistic.com/build-notes/${slug}/</link>`))
}

const manifest = JSON.parse(await readOutput('manifest.webmanifest'))
assert.equal(manifest.name, 'Saberistic — Prototype to Production')
assert.equal(manifest.icons[0]?.src, '/brand/saberistic-mark.png')

for (const relativePath of ['apple-icon.png', 'brand/saberistic-mark.png', 'icon.png']) {
  assert.ok((await stat(path.join(outputRoot, relativePath))).size > 0)
}

const cryptopalVideo = await readFile(path.join(outputRoot, cryptopalVideoPath))
assert.equal(cryptopalVideo.byteLength, 8_916_669)
assert.equal(
  createHash('sha256').update(cryptopalVideo).digest('hex'),
  'cafb08d2f0d0a718db3f3556416ee234a98075fd2155ed0fc0da10491c5d8e03',
)
const cryptopalPoster = await readFile(path.join(outputRoot, cryptopalPosterPath))
assert.equal(cryptopalPoster.byteLength, 33_050)
assert.equal(
  createHash('sha256').update(cryptopalPoster).digest('hex'),
  'b9a204945a12f120db4ffce1d6e58b929827d5217c9f7f2bf9a7feaf3e63d978',
)

console.log(
  `Verified static SEO, brand and CryptoPal media assets, ${buildNoteSlugs.length} build note(s), and ${snapshot.prototypes.items.length} prototype route(s).`,
)
