import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const siteRoot = path.resolve(dirname, '..')
const outputRoot = path.join(siteRoot, 'out')
const snapshotPath = path.join(siteRoot, '.generated/public-content.json')

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

console.log(
  `Verified static SEO, brand assets, ${buildNoteSlugs.length} build note(s), and ${snapshot.prototypes.items.length} prototype route(s).`,
)
