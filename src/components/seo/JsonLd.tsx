type JsonLdProps = {
  data: unknown
  id: string
}

export function JsonLd({ data, id }: JsonLdProps) {
  const serialized = JSON.stringify(data).replace(/</g, '\\u003c')

  return (
    <script dangerouslySetInnerHTML={{ __html: serialized }} id={id} type="application/ld+json" />
  )
}
