import { cp, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const siteRoot = path.resolve(dirname, '..')
const repositoryRoot = path.resolve(siteRoot, '../..')
const source = path.join(repositoryRoot, 'public/media')
const destination = path.join(siteRoot, 'out/media')

await rm(destination, { force: true, recursive: true })
await mkdir(destination, { recursive: true })
await cp(source, destination, { recursive: true })

console.log('Copied shared media into the static export.')
