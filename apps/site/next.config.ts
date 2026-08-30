import type { NextConfig } from 'next'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'export',
  poweredByHeader: false,
  reactStrictMode: true,
  trailingSlash: true,
  turbopack: {
    root: path.resolve(dirname, '../..'),
  },
}

export default nextConfig
