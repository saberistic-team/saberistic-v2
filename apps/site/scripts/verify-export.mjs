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

function assertPageMetadata(html, canonical) {
  assert.match(html, new RegExp(`<link rel="canonical" href="${canonical}"`))
  assert.match(html, /<meta property="og:title" content="[^"]+"/)
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
  ['privacy/index.html', 'https://saberistic.com/privacy/'],
  ['prototypes/index.html', 'https://saberistic.com/prototypes/'],
  ['readiness/index.html', 'https://saberistic.com/readiness/'],
]) {
  assertPageMetadata(await readOutput(relativePath), canonical)
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
  'https://saberistic.com/privacy/',
  'https://saberistic.com/prototypes/',
  'https://saberistic.com/readiness/',
  ...snapshot.prototypes.items.map(
    (prototype) => `https://saberistic.com/prototypes/${prototype.slug}/`,
  ),
]) {
  assert.match(sitemap, new RegExp(`<loc>${canonical}</loc>`))
}
assert.doesNotMatch(sitemap, /\/admin|\/api/)

const manifest = JSON.parse(await readOutput('manifest.webmanifest'))
assert.equal(manifest.name, 'Saberistic — Prototype to Production')
assert.equal(manifest.icons[0]?.src, '/brand/saberistic-mark.png')

for (const relativePath of ['apple-icon.png', 'brand/saberistic-mark.png', 'icon.png']) {
  assert.ok((await stat(path.join(outputRoot, relativePath))).size > 0)
}

console.log(
  `Verified static SEO, brand assets, and ${snapshot.prototypes.items.length} prototype route(s).`,
)
