import { mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { fetchPublicSiteSnapshot, generatedSnapshotPath } from '../src/lib/snapshot-source'

const snapshot = await fetchPublicSiteSnapshot()
const directory = path.dirname(generatedSnapshotPath)
const temporaryPath = `${generatedSnapshotPath}.${process.pid}.tmp`

await mkdir(directory, { recursive: true })
await writeFile(temporaryPath, `${JSON.stringify(snapshot)}\n`, {
  encoding: 'utf8',
  mode: 0o600,
})
await rename(temporaryPath, generatedSnapshotPath)

console.log(
  `Prepared public content revision ${snapshot.contentRevision.slice(0, 12)} with ${snapshot.prototypes.items.length} prototype(s).`,
)
