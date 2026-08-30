import { buildNotes } from '@/lib/build-notes'

export const dynamicParams = false

export function generateStaticParams() {
  return buildNotes.map(({ slug }) => ({ slug }))
}

export { default, generateMetadata } from '@/app/(frontend)/build-notes/[slug]/page'
