import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: '#f3f1ea',
    description:
      'Senior architecture and hands-on engineering for ambitious AI and software products.',
    display: 'standalone',
    icons: [
      {
        purpose: 'any',
        sizes: '400x400',
        src: '/brand/saberistic-mark.png',
        type: 'image/png',
      },
    ],
    name: 'Saberistic — Prototype to Production',
    scope: '/',
    short_name: 'Saberistic',
    start_url: '/',
    theme_color: '#f3f1ea',
  }
}
