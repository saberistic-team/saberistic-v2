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
const spiralSafeMedia = [
  {
    duration: 'PT11.56S',
    label: 'Actual unpacked extension demo fixture walkthrough',
    posterBytes: 279_123,
    posterPath: 'media/build-notes/spiral-safe/extension-demo-poster.b5f6960e.png',
    posterSha256: 'b5f6960ea3bf4543a67dcfdef05ba9c0d62d868898d513172ecf9d9e8cff4f3f',
    videoBytes: 1_123_877,
    videoPath: 'media/build-notes/spiral-safe/extension-demo.13df0952.webm',
    videoSha256: '13df09520cb915c26c32c58ceddf9341b5aa4c273155bd4e834bab90b20bc926',
  },
  {
    duration: 'PT10.84S',
    label: 'Standalone wallet page fixture walkthrough',
    posterBytes: 322_723,
    posterPath: 'media/build-notes/spiral-safe/standalone-wallet-poster.77908939.png',
    posterSha256: '779089396a7e53a3a6556cc6dcd9bada59792e64ec6c791ec2bab9cfb3800b1d',
    videoBytes: 1_186_466,
    videoPath: 'media/build-notes/spiral-safe/standalone-wallet.9a794fe6.webm',
    videoSha256: '9a794fe65fc107c009cfecda69d31ea53b0723cd4b4fdd65360da71a399a6551',
  },
  {
    duration: 'PT11.08S',
    label: 'Developer dashboard fixture walkthrough',
    posterBytes: 119_338,
    posterPath: 'media/build-notes/spiral-safe/developer-dashboard-poster.751ad2ef.png',
    posterSha256: '751ad2ef680905cf2f0b06dfe1ce24b2e8495199306ec5fe048ae7a2bf13d6a8',
    videoBytes: 1_009_015,
    videoPath: 'media/build-notes/spiral-safe/developer-dashboard.7a063c1a.webm',
    videoSha256: '7a063c1a54c4400e70dbc6ead74face94160843348ac3217244a6177b31d9673',
  },
  {
    duration: 'PT11.52S',
    label: 'Admin dashboard fixture walkthrough',
    posterBytes: 121_280,
    posterPath: 'media/build-notes/spiral-safe/admin-dashboard-poster.a94557dc.png',
    posterSha256: 'a94557dc49057a2bcd2bcecf103e433ccb3530d7741a88765f9c7bb70bf8a424',
    videoBytes: 954_158,
    videoPath: 'media/build-notes/spiral-safe/admin-dashboard.846c8e38.webm',
    videoSha256: '846c8e38dcaa8bb42ef52c7ead8af9f4224be3de7b3ae7f3012ffbc94c752d35',
  },
]

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
  ['gifts/index.html', 'https://saberistic.com/gifts/'],
  ['privacy/index.html', 'https://saberistic.com/privacy/'],
  ['prototypes/index.html', 'https://saberistic.com/prototypes/'],
  ['readiness/index.html', 'https://saberistic.com/readiness/'],
]) {
  assertPageMetadata(await readOutput(relativePath), canonical)
}

const giftsPage = await readOutput('gifts/index.html')
assert.match(giftsPage, /Pick one\. Pass two\. Make my day\./)
assert.match(giftsPage, /fixed gift contribution/)
assert.match(giftsPage, /does not place a retailer order/)
assert.match(giftsPage, /Checking inventory/)
assert.doesNotMatch(giftsPage, /OPENROUTER_API_KEY|STRIPE_SECRET_KEY|GIFT_QUOTE_SECRET/)

const readinessPage = await readOutput('readiness/index.html')
assert.match(readinessPage, /Find the gate before it becomes the incident\./)
assert.match(readinessPage, /Who can reach the system today\?/)
assert.match(readinessPage, /The model never owns the result\./)
assert.doesNotMatch(readinessPage, /OPENROUTER_API_KEY|READINESS_HANDOFF_SECRET/)

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

const growthProgramDevnet = await readOutput(
  'build-notes/growth-program-sensor-scorecards-devnet/index.html',
)
assert.match(
  growthProgramDevnet,
  /Growth Program: taking sensor-backed scorecards to Solana devnet/,
)
assert.match(growthProgramDevnet, /3497678/)
assert.match(growthProgramDevnet, /href="#telemetry-pipeline"/)
assert.match(growthProgramDevnet, /href="#artifact-proof"/)
assert.match(growthProgramDevnet, /experimental Solana devnet identity/)
assert.match(growthProgramDevnet, /The contract receives a grade, not a firehose of readings\./)
assert.match(
  growthProgramDevnet,
  /The program is on devnet\. The hosted playground still cannot touch it\./,
)
assert.match(growthProgramDevnet, /NO-GO beyond experimental devnet/)
assert.match(growthProgramDevnet, /511,312/)
assert.match(
  growthProgramDevnet,
  /c2fbee57bbfe9481e9c4348e0b88bc24c5dee51f3dd206c844b9bd8485029ff6/,
)

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

const harnessM3 = await readOutput('build-notes/harness-permissioned-agent-services-m3/index.html')
assert.match(harnessM3, /Harness Platform M3: putting permission around the agent loop/)
assert.match(harnessM3, /defbf7b/)
assert.match(harnessM3, /href="#permission-loop"/)
assert.match(harnessM3, /href="#sandbox"/)
assert.match(harnessM3, /harness\/acp\/1/)
assert.match(harnessM3, /Streaming means events, not model tokens/)
assert.match(harnessM3, /333 \/ 333/)
assert.match(harnessM3, /The task-specific report is session evidence/)
assert.match(harnessM3, /No live stack/)

const spiralSafe = await readOutput('build-notes/spiral-safe-passkey-signing-platform/index.html')
assert.match(
  spiralSafe,
  /Spiral Safe: rebuilding a passkey-gated signing platform across eight repositories/,
)
assert.match(spiralSafe, /8 pinned commits/)
assert.match(spiralSafe, /href="#webauthn"/)
assert.match(spiralSafe, /href="#veil-nitro"/)
assert.match(spiralSafe, /103 tests passed/)
assert.match(spiralSafe, /260 requests across 26 method\/path scenarios/)
assert.match(spiralSafe, /The fixture sees a bearer header/)
assert.match(spiralSafe, /No EIF was created/)
assert.equal((spiralSafe.match(/<video/g) || []).length, 4)
assert.equal((spiralSafe.match(/"@type":"VideoObject"/g) || []).length, 4)
assert.equal(
  (
    spiralSafe.match(
      /<summary[^>]*>Visual transcript for this silent fixture recording<\/summary>/g,
    ) || []
  ).length,
  4,
)
assert.doesNotMatch(spiralSafe, /<video[^>]*(?:autoplay|loop)/)
for (const media of spiralSafeMedia) {
  assert.match(spiralSafe, new RegExp(`<video[^>]*aria-label="${media.label}"`))
  const id = media.videoPath.split('/').at(-1).split('.')[0]
  assert.match(
    spiralSafe,
    new RegExp(
      `<video[^>]*aria-describedby="${id}-caption ${id}-transcript-summary"[^>]*aria-label="${media.label}"`,
    ),
  )
  assert.match(spiralSafe, new RegExp(`poster="/${media.posterPath}"`))
  assert.match(spiralSafe, new RegExp(`<source src="/${media.videoPath}" type="video/webm"`))
  assert.match(spiralSafe, new RegExp(`<figcaption id="${id}-caption"`))
  assert.match(spiralSafe, new RegExp(`<summary id="${id}-transcript-summary"`))
  assert.match(spiralSafe, new RegExp(`<a download="" href="/${media.videoPath}"`))
  assert.match(
    spiralSafe,
    new RegExp(`"contentUrl":"https://saberistic.com/${media.videoPath.replaceAll('/', '\\/')}"`),
  )
  assert.match(spiralSafe, new RegExp(`"duration":"${media.duration}"`))
}

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
  'https://saberistic.com/gifts/',
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

for (const media of spiralSafeMedia) {
  const video = await readFile(path.join(outputRoot, media.videoPath))
  assert.equal(video.byteLength, media.videoBytes)
  assert.equal(createHash('sha256').update(video).digest('hex'), media.videoSha256)

  const poster = await readFile(path.join(outputRoot, media.posterPath))
  assert.equal(poster.byteLength, media.posterBytes)
  assert.equal(createHash('sha256').update(poster).digest('hex'), media.posterSha256)
}

console.log(
  `Verified static SEO, brand, CryptoPal and Spiral Safe media assets, ${buildNoteSlugs.length} build note(s), and ${snapshot.prototypes.items.length} prototype route(s).`,
)
