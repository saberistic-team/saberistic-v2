import 'server-only'

import { lookup } from 'node:dns/promises'
import { request as httpsRequest } from 'node:https'
import { BlockList, isIP } from 'node:net'

import { parse, type DefaultTreeAdapterTypes } from 'parse5'

import { giftProductHostFamily, isVerifiableGiftProductHost } from '../retailers'
import { giftBudgetById, type GiftBudgetId } from '../types'
import { safeGiftSourceURL, validateModelGiftIdea, type ModelGiftIdea } from '../validation'

const listingBodyLimitBytes = 1024 * 1024
const listingDNSLookupTimeoutMs = 2_000
const listingRequestTimeoutMs = 4_000
const listingVerificationTimeoutMs = 8_000
const listingVerificationConcurrency = 4
const maximumRedirects = 2
const maximumStructuredNodes = 256

type ListingAddress = { address: string; family: 4 | 6 }

const blockedIPv4Addresses = new BlockList()
for (const [address, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blockedIPv4Addresses.addSubnet(address, prefix, 'ipv4')
}

const blockedIPv6Addresses = new BlockList()
for (const [address, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['::ffff:0:0', 96],
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 32],
  ['2001:2::', 48],
  ['2001:10::', 28],
  ['2001:20::', 28],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['3fff::', 20],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
] as const) {
  blockedIPv6Addresses.addSubnet(address, prefix, 'ipv6')
}
const globalIPv6Addresses = new BlockList()
globalIPv6Addresses.addSubnet('2000::', 3, 'ipv6')

export type GiftListingLoader = (url: URL, signal: AbortSignal) => Promise<string | null>

export type GiftListingRejectionReason =
  | 'availability'
  | 'budget_above'
  | 'budget_below'
  | 'currency'
  | 'host'
  | 'load'
  | 'offer'
  | 'policy'
  | 'price'
  | 'product'

export type GiftListingVerification<T extends ModelGiftIdea> = {
  checked: number
  rejections: Partial<Record<GiftListingRejectionReason, number>>
  sourcePricesChanged: number
  verified: T[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPublicIPv4(address: string): boolean {
  return isIP(address) === 4 && !blockedIPv4Addresses.check(address, 'ipv4')
}

function isPublicIPv6(address: string): boolean {
  return (
    isIP(address) === 6 &&
    globalIPv6Addresses.check(address, 'ipv6') &&
    !blockedIPv6Addresses.check(address, 'ipv6')
  )
}

export function isPublicGiftListingAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 4) return isPublicIPv4(address)
  if (family === 6) return isPublicIPv6(address)
  return false
}

async function resolvePublicAddress(
  hostname: string,
  signal: AbortSignal,
): Promise<ListingAddress | null> {
  if (signal.aborted) return null

  return new Promise((resolve) => {
    let settled = false
    const finish = (address: ListingAddress | null) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      signal.removeEventListener('abort', abort)
      resolve(address)
    }
    const abort = () => finish(null)
    const timeout = setTimeout(() => finish(null), listingDNSLookupTimeoutMs)
    signal.addEventListener('abort', abort, { once: true })

    void lookup(hostname, { all: true, verbatim: true })
      .then((addresses) => {
        if (
          addresses.length === 0 ||
          addresses.some(({ address }) => !isPublicGiftListingAddress(address))
        ) {
          finish(null)
          return
        }
        const selected = addresses.find(({ family }) => family === 4) ?? addresses[0]
        finish(
          selected && (selected.family === 4 || selected.family === 6)
            ? { address: selected.address, family: selected.family }
            : null,
        )
      })
      .catch(() => finish(null))
  })
}

type ListingHTTPResult =
  | { location: string; status: 'redirect' }
  | { body: string; status: 'success' }
  | { status: 'failure' }

function requestListingPage(
  url: URL,
  address: ListingAddress,
  signal: AbortSignal,
): Promise<ListingHTTPResult> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (result: ListingHTTPResult) => {
      if (settled) return
      settled = true
      signal.removeEventListener('abort', abort)
      resolve(result)
    }
    const abort = () => request.destroy()
    const request = httpsRequest(
      url,
      {
        headers: {
          Accept: 'text/html, application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.8',
          'User-Agent': 'Saberistic-GiftDraft-Verifier/1.0 (+https://saberistic.com/gifts)',
        },
        lookup: (_hostname, options, callback) => {
          if (options.all) {
            callback(null, [address])
            return
          }
          callback(null, address.address, address.family)
        },
        method: 'GET',
        servername: url.hostname,
      },
      (response) => {
        response.on('error', () => finish({ status: 'failure' }))
        const status = response.statusCode ?? 0
        if ([301, 302, 303, 307, 308].includes(status)) {
          const location = response.headers.location
          response.destroy()
          finish(location ? { location, status: 'redirect' } : { status: 'failure' })
          return
        }

        const contentType = response.headers['content-type']?.toLowerCase() ?? ''
        const contentEncoding = response.headers['content-encoding']?.toLowerCase()
        const contentLength = Number(response.headers['content-length'])
        if (
          status !== 200 ||
          (!contentType.startsWith('text/html') &&
            !contentType.startsWith('application/xhtml+xml')) ||
          (contentEncoding && contentEncoding !== 'identity') ||
          (Number.isFinite(contentLength) && contentLength > listingBodyLimitBytes)
        ) {
          response.destroy()
          finish({ status: 'failure' })
          return
        }

        const chunks: Buffer[] = []
        let bytes = 0
        response.on('data', (chunk: Buffer | string) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
          bytes += buffer.byteLength
          if (bytes > listingBodyLimitBytes) {
            response.destroy()
            finish({ status: 'failure' })
            return
          }
          chunks.push(buffer)
        })
        response.on('end', () => {
          if (bytes === 0) {
            finish({ status: 'failure' })
            return
          }
          finish({ body: Buffer.concat(chunks, bytes).toString('utf8'), status: 'success' })
        })
      },
    )

    request.setTimeout(listingRequestTimeoutMs, () => request.destroy())
    request.on('error', () => finish({ status: 'failure' }))
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
    request.end()
  })
}

export async function loadGiftListingHTML(url: URL, signal: AbortSignal): Promise<string | null> {
  const initialFamily = giftProductHostFamily(url.hostname)
  if (!initialFamily) return null

  let current = url
  for (let redirects = 0; redirects <= maximumRedirects; redirects += 1) {
    if (
      signal.aborted ||
      current.protocol !== 'https:' ||
      current.username ||
      current.password ||
      (current.port && current.port !== '443') ||
      giftProductHostFamily(current.hostname) !== initialFamily
    ) {
      return null
    }

    const address = await resolvePublicAddress(current.hostname, signal)
    if (!address || signal.aborted) return null
    const result = await requestListingPage(current, address, signal)
    if (result.status === 'success') return result.body
    if (result.status !== 'redirect' || redirects === maximumRedirects) return null

    try {
      const redirected = new URL(result.location, current)
      if (!safeGiftSourceURL(redirected.toString())) return null
      current = redirected
    } catch {
      return null
    }
  }

  return null
}

function comparableProductTitle(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/\p{Cf}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase()
}

function schemaContextValue(value: unknown): boolean {
  const values = Array.isArray(value) ? value : [value]
  if (values.length !== 1) return false
  const context = values[0]
  if (typeof context === 'string') {
    return context === 'http://schema.org' || context === 'https://schema.org'
      ? true
      : context === 'http://schema.org/' || context === 'https://schema.org/'
  }
  return (
    isRecord(context) && Object.keys(context).length === 1 && schemaContextValue(context['@vocab'])
  )
}

function structuredType(value: unknown, expected: string, schemaContext: boolean): boolean {
  const values = Array.isArray(value) ? value : [value]
  if (values.length !== 1) return false
  const candidate = values[0]
  if (typeof candidate !== 'string') return false
  return (
    (schemaContext && candidate === expected) ||
    candidate === `http://schema.org/${expected}` ||
    candidate === `https://schema.org/${expected}`
  )
}

function decimalPriceToCents(value: unknown): number | null {
  const candidate =
    typeof value === 'number' && Number.isFinite(value)
      ? String(value)
      : typeof value === 'string'
        ? value.trim()
        : ''
  const match = candidate.match(/^(0|[1-9]\d{0,5})(?:\.(\d{1,4}))?$/)
  if (!match) return null

  const fraction = match[2] ?? ''
  if (fraction.slice(2).replaceAll('0', '')) return null
  const cents = Number(match[1]) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2))
  return Number.isSafeInteger(cents) ? cents : null
}

function elementText(node: DefaultTreeAdapterTypes.ParentNode): string {
  return node.childNodes
    .map((child) => {
      if ('value' in child) return child.value
      return 'childNodes' in child ? elementText(child) : ''
    })
    .join('')
}

function jsonLDScripts(document: DefaultTreeAdapterTypes.Document): string[] {
  const scripts: string[] = []
  const visit = (node: DefaultTreeAdapterTypes.Node) => {
    if ('tagName' in node && node.tagName === 'script') {
      const type = node.attrs.find((attribute) => attribute.name.toLowerCase() === 'type')?.value
      if (type?.trim().toLowerCase() === 'application/ld+json') scripts.push(elementText(node))
    }
    if ('childNodes' in node) node.childNodes.forEach(visit)
  }
  visit(document)
  return scripts
}

function listingURLIdentity(value: unknown, base: URL): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const resolved = new URL(value, base)
    const safe = safeGiftSourceURL(resolved.toString())
    if (!safe) return null
    const url = new URL(safe)
    const family = giftProductHostFamily(url.hostname)
    if (!family) return null
    let pathname = url.pathname === '/' ? '/' : url.pathname.replace(/\/+$/, '')
    if (family === 'uncommongoods.com') pathname = pathname.replace(/\/\d{8,18}$/, '')
    return `${family}${pathname}`
  } catch {
    return null
  }
}

function absoluteListingURLIdentity(value: unknown, base: URL): string | null {
  if (typeof value !== 'string') return null
  try {
    new URL(value)
  } catch {
    return null
  }
  return listingURLIdentity(value, base)
}

function singleOffer(value: unknown): Record<string, unknown> | null {
  if (isRecord(value)) return value
  return Array.isArray(value) && value.length === 1 && isRecord(value[0]) ? value[0] : null
}

type StructuredRecord = { record: Record<string, unknown>; schemaContext: boolean }

function structuredRecords(value: unknown): StructuredRecord[] {
  const records: StructuredRecord[] = []
  const queue: Array<{ depth: number; schemaContext: boolean; value: unknown }> = [
    { depth: 0, schemaContext: false, value },
  ]

  while (queue.length && records.length < maximumStructuredNodes) {
    const current = queue.shift()!
    if (current.depth > 8) continue
    if (Array.isArray(current.value)) {
      current.value.slice(0, maximumStructuredNodes).forEach((entry) =>
        queue.push({
          depth: current.depth + 1,
          schemaContext: current.schemaContext,
          value: entry,
        }),
      )
      continue
    }
    if (!isRecord(current.value)) continue
    const schemaContext = Object.hasOwn(current.value, '@context')
      ? schemaContextValue(current.value['@context'])
      : current.schemaContext
    records.push({ record: current.value, schemaContext })
    Object.values(current.value)
      .slice(0, maximumStructuredNodes)
      .forEach((entry) => queue.push({ depth: current.depth + 1, schemaContext, value: entry }))
  }

  return records
}

type ListingEvidence =
  | { name: string; ok: true; priceCents: number }
  | {
      ok: false
      reason: Exclude<
        GiftListingRejectionReason,
        'budget_above' | 'budget_below' | 'host' | 'load' | 'policy'
      >
    }

function listingEvidence(html: string, sourceURL: URL): ListingEvidence {
  if (new TextEncoder().encode(html).byteLength > listingBodyLimitBytes) {
    return { ok: false, reason: 'product' }
  }

  let document: DefaultTreeAdapterTypes.Document
  try {
    document = parse(html)
  } catch {
    return { ok: false, reason: 'product' }
  }

  const products: StructuredRecord[] = []
  for (const script of jsonLDScripts(document).slice(0, 64)) {
    if (!script.trim() || new TextEncoder().encode(script).byteLength > listingBodyLimitBytes)
      continue
    try {
      products.push(
        ...structuredRecords(JSON.parse(script)).filter(({ record, schemaContext }) =>
          structuredType(record['@type'], 'Product', schemaContext),
        ),
      )
    } catch {
      // Ignore malformed independent structured-data blocks.
    }
  }

  const sourceIdentity = listingURLIdentity(sourceURL.toString(), sourceURL)
  if (!sourceIdentity) return { ok: false, reason: 'product' }
  const matchingProducts = products.filter(({ record: product }) => {
    if (typeof product.name !== 'string') return false
    const offer = singleOffer(product.offers)
    if (!offer || absoluteListingURLIdentity(offer.url, sourceURL) !== sourceIdentity) return false
    return (
      product.url === undefined || listingURLIdentity(product.url, sourceURL) === sourceIdentity
    )
  })
  if (matchingProducts.length !== 1) return { ok: false, reason: 'product' }

  const { record: product, schemaContext: productSchemaContext } = matchingProducts[0]!
  const offer = singleOffer(product.offers)
  const offerSchemaContext =
    offer && Object.hasOwn(offer, '@context')
      ? schemaContextValue(offer['@context'])
      : productSchemaContext
  if (!offer || !structuredType(offer['@type'], 'Offer', offerSchemaContext)) {
    return { ok: false, reason: 'offer' }
  }
  if (offer.priceCurrency !== 'USD') return { ok: false, reason: 'currency' }
  if (!structuredType(offer.availability, 'InStock', offerSchemaContext)) {
    return { ok: false, reason: 'availability' }
  }
  if (
    offer.itemCondition !== undefined &&
    !structuredType(offer.itemCondition, 'NewCondition', offerSchemaContext)
  ) {
    return { ok: false, reason: 'offer' }
  }
  const priceCents = decimalPriceToCents(offer.price)
  return priceCents === null
    ? { ok: false, reason: 'price' }
    : { name: product.name as string, ok: true, priceCents }
}

export function listingMatchesCandidate(html: string, candidate: ModelGiftIdea): boolean {
  const sourceURL = safeGiftSourceURL(candidate.sourceUrl)
  if (!sourceURL) return false
  const evidence = listingEvidence(html, new URL(sourceURL))
  return (
    evidence.ok &&
    comparableProductTitle(evidence.name) === comparableProductTitle(candidate.name) &&
    evidence.priceCents === candidate.observedPriceCents
  )
}

type CandidateVerification<T extends ModelGiftIdea> =
  { candidate: T; sourcePriceChanged: boolean } | { reason: GiftListingRejectionReason }

async function verifyCandidate<T extends ModelGiftIdea>(
  candidate: T,
  budget: GiftBudgetId,
  signal: AbortSignal,
  load: GiftListingLoader,
): Promise<CandidateVerification<T>> {
  const sourceUrl = safeGiftSourceURL(candidate.sourceUrl)
  if (!sourceUrl) return { reason: 'host' }

  const url = new URL(sourceUrl)
  if (!isVerifiableGiftProductHost(url.hostname)) return { reason: 'host' }

  try {
    const html = await load(url, signal)
    if (!html) return { reason: 'load' }
    const evidence = listingEvidence(html, url)
    if (!evidence.ok) return { reason: evidence.reason }
    const range = giftBudgetById(budget)
    if (evidence.priceCents < range.minimumCents) return { reason: 'budget_below' }
    if (evidence.priceCents > range.maximumCents) return { reason: 'budget_above' }
    const verified = validateModelGiftIdea(
      {
        category: candidate.category,
        currency: candidate.currency,
        name: evidence.name,
        observedPriceCents: evidence.priceCents,
        retailer: candidate.retailer,
        sourceUrl: candidate.sourceUrl,
        whyItFits: candidate.whyItFits,
      },
      budget,
    )
    if (!verified) return { reason: 'policy' }
    return {
      candidate: { ...candidate, ...verified },
      sourcePriceChanged: evidence.priceCents !== candidate.observedPriceCents,
    }
  } catch {
    return { reason: 'load' }
  }
}

export async function verifyGiftListings<T extends ModelGiftIdea>(
  candidates: readonly T[],
  {
    budget,
    load = loadGiftListingHTML,
    signal,
  }: { budget: GiftBudgetId; load?: GiftListingLoader; signal: AbortSignal },
): Promise<GiftListingVerification<T>> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal.addEventListener('abort', abort, { once: true })
  const timeout = setTimeout(abort, listingVerificationTimeoutMs)
  const verified: Array<T | null> = Array.from({ length: candidates.length }, () => null)
  const rejections: Partial<Record<GiftListingRejectionReason, number>> = {}
  let checked = 0
  let nextIndex = 0
  let sourcePricesChanged = 0

  try {
    await Promise.all(
      Array.from(
        { length: Math.min(listingVerificationConcurrency, candidates.length) },
        async () => {
          while (!controller.signal.aborted) {
            const index = nextIndex
            nextIndex += 1
            if (index >= candidates.length) return
            checked += 1
            const result = await verifyCandidate(
              candidates[index]!,
              budget,
              controller.signal,
              load,
            )
            if ('candidate' in result) {
              verified[index] = result.candidate
              if (result.sourcePriceChanged) sourcePricesChanged += 1
              continue
            }
            rejections[result.reason] = (rejections[result.reason] ?? 0) + 1
          }
        },
      ),
    )
  } finally {
    clearTimeout(timeout)
    signal.removeEventListener('abort', abort)
    controller.abort()
  }

  return {
    checked,
    rejections,
    sourcePricesChanged,
    verified: verified.filter((candidate): candidate is T => Boolean(candidate)),
  }
}
