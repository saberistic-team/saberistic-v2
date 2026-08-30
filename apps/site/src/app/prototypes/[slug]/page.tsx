import { getPublicPrototypes } from '@/lib/public-content/prototypes'

export const dynamicParams = false

export async function generateStaticParams() {
  const prototypes = await getPublicPrototypes()
  return prototypes.items.map(({ slug }) => ({ slug }))
}

export { default, generateMetadata } from '@/app/(frontend)/prototypes/[slug]/page'
