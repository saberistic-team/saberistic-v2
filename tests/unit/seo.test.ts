import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { JsonLd } from '@/components/seo/JsonLd'
import { createPageMetadata } from '@/lib/seo'

describe('public SEO metadata', () => {
  it('builds exact canonical and social metadata for a route', () => {
    const metadata = createPageMetadata({
      description: 'A reviewed prototype.',
      path: '/prototypes/example/',
      title: 'Example',
    })

    expect(metadata).toMatchObject({
      alternates: { canonical: new URL('https://saberistic.com/prototypes/example/') },
      description: 'A reviewed prototype.',
      openGraph: {
        description: 'A reviewed prototype.',
        title: 'Example — Saberistic',
        url: new URL('https://saberistic.com/prototypes/example/'),
      },
      title: 'Example',
      twitter: {
        card: 'summary',
        title: 'Example — Saberistic',
      },
    })
  })

  it('escapes structured data before placing it in a script element', () => {
    const html = renderToStaticMarkup(
      createElement(JsonLd, {
        data: { value: '</script><script>alert(1)</script>' },
        id: 'safe-json-ld',
      }),
    )

    expect(html).toContain('\\u003c/script>\\u003cscript>')
    expect(html).not.toContain('</script><script>')
  })
})
