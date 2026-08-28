import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { EvidenceSources } from './collections/EvidenceSources'
import { Media } from './collections/Media'
import { Prototypes } from './collections/Prototypes'
import { Users } from './collections/Users'
import { SiteSettings } from './globals/SiteSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const serverURL =
  process.env.SITE_URL?.trim() ||
  process.env.RENDER_EXTERNAL_URL?.trim() ||
  'http://localhost:3000'
const allowedOrigin = new URL(serverURL).origin

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, EvidenceSources, Prototypes],
  cors: [allowedOrigin],
  csrf: [allowedOrigin],
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
