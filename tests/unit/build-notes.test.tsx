import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CryptoPalArticle } from '@/content/build-notes/CryptoPal'
import { GrowthProgramArticle } from '@/content/build-notes/GrowthProgram'
import { HarnessEvalCredibilityArticle } from '@/content/build-notes/HarnessEvalCredibility'
import { HarnessFromScratchArticle } from '@/content/build-notes/HarnessFromScratch'
import { HarnessOperatorLoopArticle } from '@/content/build-notes/HarnessOperatorLoop'
import { HarnessPermissionedServicesArticle } from '@/content/build-notes/HarnessPermissionedServices'
import { LovablePrototypeTrioArticle } from '@/content/build-notes/LovablePrototypeTrio'
import { SpiralSafeArticle } from '@/content/build-notes/SpiralSafe'
import { TurboPassArticle } from '@/content/build-notes/TurboPass'
import { buildNotes, getBuildNote } from '@/lib/build-notes'
import { createBuildNotesRSS } from '@/lib/build-notes-feed'

describe('Git-authored build notes', () => {
  it('publishes an explicit, unique, newest-first manifest', () => {
    expect(buildNotes.length).toBeGreaterThan(0)

    const slugs = buildNotes.map((note) => note.slug)
    expect(new Set(slugs).size).toBe(slugs.length)

    for (const note of buildNotes) {
      expect(note.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      expect(note.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(note.modifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Date.parse(note.modifiedAt)).toBeGreaterThanOrEqual(Date.parse(note.publishedAt))
      expect(note.readingMinutes).toBeGreaterThan(0)
      expect(note.repositories.length).toBeGreaterThan(0)
      for (const repository of note.repositories) {
        expect(repository.commit).toMatch(/^[a-f0-9]{40}$/)
        expect(repository.label.length).toBeGreaterThan(0)
        expect(repository.url).toMatch(
          /^https:\/\/github\.com\/(?:saberistic-team|saberistic|Spiral-Safe)\/[a-z0-9.-]+$/,
        )
      }
      expect(`${note.seoTitle} — Saberistic`.length).toBeLessThanOrEqual(60)
      expect(note.summary.length).toBeLessThanOrEqual(200)
    }

    expect([...buildNotes].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))).toEqual(
      buildNotes,
    )
    expect(getBuildNote('harness-from-scratch')?.repositories[0]?.commit.slice(0, 7)).toBe(
      '88ef2f4',
    )
    expect(getBuildNote('harness-operator-loop-m1')?.repositories[0]?.commit.slice(0, 7)).toBe(
      'a596fc5',
    )
    expect(getBuildNote('turbopass-rust-temporal')?.repositories[0]?.commit.slice(0, 7)).toBe(
      'f18da56',
    )
    expect(getBuildNote('three-lovable-prototypes')?.repositories).toHaveLength(3)
    expect(getBuildNote('cryptopal-wallet-email-wallet')?.repositories).toHaveLength(3)
    expect(getBuildNote('cryptopal-wallet-email-wallet')?.repositories[0]?.commit.slice(0, 7)).toBe(
      '55f7f00',
    )
    expect(getBuildNote('growth-program-v2-scorecards')?.repositories).toHaveLength(1)
    expect(getBuildNote('growth-program-v2-scorecards')?.repositories[0]?.commit.slice(0, 7)).toBe(
      'd944ee7',
    )
    expect(getBuildNote('harness-eval-credibility-m2')?.repositories[0]?.commit.slice(0, 7)).toBe(
      '8f18f6d',
    )
    expect(
      getBuildNote('harness-permissioned-agent-services-m3')?.repositories[0]?.commit.slice(0, 7),
    ).toBe('defbf7b')
    expect(getBuildNote('spiral-safe-passkey-signing-platform')?.repositories).toHaveLength(8)
    expect(
      getBuildNote('spiral-safe-passkey-signing-platform')?.repositories[0]?.commit.slice(0, 7),
    ).toBe('34ff343')
  })

  it('renders Spiral Safe with a backend custody boundary, fixture demos, and explicit production gates', () => {
    const html = renderToStaticMarkup(createElement(SpiralSafeArticle))

    expect(html).toContain('WebAuthn-authorized signing and account platform')
    expect(html).toContain('The browser and backend disagreed about who owned the key.')
    expect(html).toContain('EIP-191 personal-message signing only')
    expect(html).toContain('260 requests across 26 method/path scenarios')
    expect(html).toContain('not a benchmark')
    expect(html).toContain('103 tests passed')
    expect(html).toContain('FIXTURE MODE · SYNTHETIC LOCAL DATA')
    expect(html).toContain('WHY THERE IS NO WEBAUTHN POPUP')
    expect(html).toContain('The fixture sees a bearer header')
    expect(html).toContain('No EIF was created')
    expect(html).toContain('34ff343')
    expect(html.match(/role="img"/g)?.length).toBe(4)
    expect(html.match(/role="region"/g)?.length).toBe(4)
    expect(html.match(/<video/g)?.length).toBe(4)
    expect(html.match(/preload="none"/g)?.length).toBe(4)
    expect(html.match(/type="video\/webm"/g)?.length).toBe(4)
    expect(html.match(/aria-describedby="[^"]+-caption [^"]+-transcript-summary"/g)?.length).toBe(4)
    expect(html.match(/ download=""/g)?.length).toBe(8)
    expect(html).not.toContain('<time>')
    expect(html.match(/Visual transcript for this silent fixture recording/g)?.length).toBe(4)
    expect(html.match(/<figure class="article-code">/g)?.length).toBeGreaterThanOrEqual(9)
  })

  it('renders M3 with a fail-closed permission path and explicit live-operation gates', () => {
    const html = renderToStaticMarkup(createElement(HarnessPermissionedServicesArticle))

    expect(html).toContain('permissioned service boundary around the agent loop')
    expect(html).toContain('harness/acp/1')
    expect(html).toContain('Streaming means events, not model tokens')
    expect(html).toContain('Only an explicit <code>y</code> or <code>yes</code> is approval')
    expect(html).toContain('The sandbox refuses rules Docker cannot express without widening them')
    expect(html).toContain('Fifty focused adapter tests, zero live provider calls')
    expect(html).toContain('333 / 333')
    expect(html).toContain('The task-specific report is session evidence')
    expect(html).toContain('No live stack')
    expect(html).toContain('defbf7b')
    expect(html.match(/role="img"/g)?.length).toBe(4)
    expect(html.match(/role="region"/g)?.length).toBe(4)
    expect(html).toContain('tabindex="0"')
    expect(html.match(/<figure class="article-code">/g)?.length).toBeGreaterThanOrEqual(10)
  })

  it('renders M2 with a calibration target, opt-in telemetry, and a gated live MCP lane', () => {
    const html = renderToStaticMarkup(createElement(HarnessEvalCredibilityArticle))

    expect(html).toContain('123 / 123')
    expect(html).toContain('7 / 7')
    expect(html).toContain('13 tools')
    expect(html).toContain('Telemetry is fully off unless the operator opts in')
    expect(html).toContain('that CLI sequence currently creates no spans or counters')
    expect(html).toContain('never runs in the default pull-request or push lane')
    expect(html).toContain('2025-11-25')
    expect(html).toContain('2026-07-28')
    expect(html).toContain('future compatibility adapter')
    expect(html).toContain('8f18f6d')
    expect(html.match(/role="img"/g)?.length).toBe(4)
    expect(html.match(/role="region"/g)?.length).toBe(4)
    expect(html).toContain('tabindex="0"')
    expect(html.match(/<figure class="article-code">/g)?.length).toBeGreaterThanOrEqual(9)
  })

  it('renders Growth Program v2 with containment, two demo boundaries, and release gates', () => {
    const html = renderToStaticMarkup(createElement(GrowthProgramArticle))

    expect(html).toContain('issuer-attested, multi-pillar scorecard and credential primitive')
    expect(html).toContain(
      'implemented and locally validated. It is not deployed or release-ready.',
    )
    expect(html).toContain('none becomes a V2 score')
    expect(html).toContain('no RPC, wallet, signing, transaction sending')
    expect(html).toContain('genesis-loads the exact binary')
    expect(html).toContain('10 / 10')
    expect(html).toContain('12 / 12')
    expect(html).toContain('4 / 4')
    expect(html).toContain('15 / 15')
    expect(html).toContain('1 / 1')
    expect(html).toContain('d944ee7')
    expect(html.match(/role="img"/g)?.length).toBe(4)
    expect(html.match(/<figure class="article-code">/g)?.length).toBeGreaterThanOrEqual(8)
  })

  it('renders CryptoPal with the two-hop protocol, measured evidence, and explicit privacy limits', () => {
    const html = renderToStaticMarkup(createElement(CryptoPalArticle))

    expect(html).toContain(
      'The proof checks one relationship; blinding provides the unlinkability.',
    )
    expect(html).toContain('The adapter is real; multi-chain support is future work.')
    expect(html).toContain('33 / 33')
    expect(html).toContain('10/10 independent users')
    expect(html).toContain('retained, independently auditable')
    expect(html).toContain('step-preserving normalization')
    expect(html).toContain('issuance returned')
    expect(html).toContain('Only a resettable local Solana/Agave ledger')
    expect(html).toContain('not a wire-compatible RFC 9497')
    expect(html).toContain('Owner-supplied CryptoPal sender screen')
    expect(html).toContain('cryptopal-private-transfer.cafb08d2.mp4')
    expect(html).toContain('cryptopal-private-transfer-poster.b9a20494.webp')
    expect(html).toContain('preload="none"')
    expect(html).toContain('playsInline=""')
    expect(html).toContain('Visual transcript for the silent recording')
    expect(html).toContain('exact message in the local Mailpit inbox')
    expect(html).toContain('one browser profile but two distinct wallet keys')
    expect(html).toContain('55f7f00')
    expect(html).not.toContain('autoPlay')
    expect(html).not.toContain('loop=""')
    expect(html.match(/<figure class="article-code">/g)?.length).toBeGreaterThanOrEqual(10)
    expect(html.match(/<svg aria-labelledby=/g)?.length).toBe(4)
    expect(html.match(/<title id=/g)?.length).toBe(4)
    expect(html.match(/<desc id=/g)?.length).toBe(4)
  })

  it('renders the harness article with labeled code, accessible diagrams, and explicit limits', () => {
    const html = renderToStaticMarkup(createElement(HarnessFromScratchArticle))

    expect(html).toContain('The harness’s best moment was refusing its own work.')
    expect(html).toContain('M0 is a foundation, not the finished platform.')
    expect(html).toContain('tabindex="0"')
    expect(html.match(/<figure class="article-code">/g)?.length).toBeGreaterThanOrEqual(8)
    expect(html.match(/<svg aria-labelledby=/g)?.length).toBe(4)
    expect(html.match(/<title id=/g)?.length).toBe(4)
    expect(html.match(/<desc id=/g)?.length).toBe(4)
    expect(html).toContain('40 / 40')
    expect(html).toContain('does not invoke Pi, Qwen')
  })

  it('renders the TurboPass article with bridge, lifecycle, rotation, and rollout evidence', () => {
    const html = renderToStaticMarkup(createElement(TurboPassArticle))

    expect(html).toContain('The thread restriction belonged to error transport, not Ristretto.')
    expect(html).toContain('Blinding stays local; issuance and redemption are synchronous.')
    expect(html).toContain('Private keys do not belong in workflow history')
    expect(html).toContain('A complete local system is not yet a production migration.')
    expect(html).toContain('after physical deletion, the same key can be accepted again')
    expect(html).toContain('fence and drain legacy writers')
    expect(html).toContain('counters from the final successful attempt can omit work')
    expect(html).toContain('session evidence rather than independently reproducible evidence')
    expect(html).toContain('tabindex="0"')
    expect(html.match(/<figure class="article-code">/g)?.length).toBeGreaterThanOrEqual(10)
    expect(html.match(/<svg aria-labelledby=/g)?.length).toBe(4)
    expect(html.match(/<title id=/g)?.length).toBe(4)
    expect(html.match(/<desc id=/g)?.length).toBe(4)
    expect(html).toContain('56 / 56')
    expect(html).toContain('no committed capacity report')
  })

  it('renders the M1 operator-loop article with durable evidence and explicit limits', () => {
    const html = renderToStaticMarkup(createElement(HarnessOperatorLoopArticle))

    expect(html).toContain('Six roadmap bullets, five dogfooded tasks')
    expect(html).toContain('This is a regression gate—not a complete per-PR scope gate.')
    expect(html).toContain('no protection on')
    expect(html).toContain('intentionally ignored')
    expect(html).toContain('one-writer assumption')
    expect(html).toContain('Calibration seed, not eval credibility')
    expect(html).toContain('M2 should make the evidence representative')
    expect(html).toContain('falls through to <code>spawnSync</code>')
    expect(html).toContain('such as <code>/pull/123</code>')
    expect(html.match(/role="region"/g)?.length).toBe(4)
    expect(html).toContain('tabindex="0"')
    expect(html.match(/<figure class="article-code">/g)?.length).toBeGreaterThanOrEqual(10)
    expect(html.match(/<svg aria-labelledby=/g)?.length).toBe(4)
    expect(html.match(/<title id=/g)?.length).toBe(4)
    expect(html.match(/<desc id=/g)?.length).toBe(4)
    expect(html).toContain('80 / 80')
    expect(html).toContain('1 / 1')
  })

  it('renders the Lovable prototype trio with source pins, diagrams, and launch boundaries', () => {
    const html = renderToStaticMarkup(createElement(LovablePrototypeTrioArticle))

    expect(html).toContain('The database owns the button')
    expect(html).toContain('Nothing durable owns the moment the clock expires')
    expect(html).toContain('AI authors the instrument; fixed code scores the person')
    expect(html).toContain('A staged argument produces a decision board, not a decision')
    expect(html).toContain('Six open high-severity CodeQL alerts')
    expect(html).toContain('Publish only the bounded, sample-data demonstration')
    expect(html).toContain('None of the repositories contains an automated test suite')
    expect(html).toContain('declares an open-source license')
    expect(html).toContain('no scheduled executor')
    expect(html.match(/role="region"/g)?.length).toBe(4)
    expect(html.match(/<figure class="article-code">/g)?.length).toBeGreaterThanOrEqual(8)
    expect(html.match(/<svg aria-labelledby=/g)?.length).toBe(4)
    expect(html.match(/<title id=/g)?.length).toBe(4)
    expect(html.match(/<desc id=/g)?.length).toBe(4)
  })

  it('emits a valid RSS item for every published note', () => {
    const rss = createBuildNotesRSS()

    expect(rss).toContain('<rss version="2.0"')
    expect(rss).toContain('<title>Saberistic Build Notes</title>')
    for (const note of buildNotes) {
      expect(rss).toContain(`<link>https://saberistic.com/build-notes/${note.slug}/</link>`)
      expect(rss).toContain(
        `<guid isPermaLink="true">https://saberistic.com/build-notes/${note.slug}/</guid>`,
      )
    }
  })
})
