import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { CaseStudies } from './collections/CaseStudies'
import { EvidenceSources } from './collections/EvidenceSources'
import { Experience } from './collections/Experience'
import { Media } from './collections/Media'
import { Prototypes } from './collections/Prototypes'
import { Users } from './collections/Users'
import { SiteSettings } from './globals/SiteSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const configuredCMSURLs = [process.env.SITE_URL, process.env.RENDER_EXTERNAL_URL]
  .map((value) => value?.trim())
  .filter((value): value is string => Boolean(value))
const configuredPublicURL = process.env.PUBLIC_SITE_URL?.trim()
const serverURL = configuredCMSURLs[0] || 'http://localhost:3000'
const allowedOrigins = [
  ...new Set(
    [serverURL, ...configuredCMSURLs, configuredPublicURL]
      .filter((value): value is string => Boolean(value))
      .map((url) => new URL(url).origin),
  ),
]

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, EvidenceSources, Prototypes, Experience, CaseStudies],
  cors: allowedOrigins,
  csrf: allowedOrigins,
  serverURL,
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  globals: [SiteSettings],
  sharp,
  upload: {
    limits: {
      fileSize: 8 * 1024 * 1024,
    },
  },
  plugins: [],
})
