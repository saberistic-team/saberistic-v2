import * as migration_20260828_221439_initial_platform from './20260828_221439_initial_platform'
import * as migration_20260829_144500_seed_prepared_content from './20260829_144500_seed_prepared_content'
import * as migration_20260829_151905 from './20260829_151905'
import * as migration_20260830_160500_publish_lovable_prototypes from './20260830_160500_publish_lovable_prototypes'
import * as migration_20260830_163500_retry_lovable_prototype_publication from './20260830_163500_retry_lovable_prototype_publication'

export const migrations = [
  {
    up: migration_20260828_221439_initial_platform.up,
    down: migration_20260828_221439_initial_platform.down,
    name: '20260828_221439_initial_platform',
  },
  {
    up: migration_20260829_144500_seed_prepared_content.up,
    down: migration_20260829_144500_seed_prepared_content.down,
    name: '20260829_144500_seed_prepared_content',
  },
  {
    up: migration_20260829_151905.up,
    down: migration_20260829_151905.down,
    name: '20260829_151905',
  },
  {
    up: migration_20260830_160500_publish_lovable_prototypes.up,
    down: migration_20260830_160500_publish_lovable_prototypes.down,
    name: '20260830_160500_publish_lovable_prototypes',
  },
  {
    up: migration_20260830_163500_retry_lovable_prototype_publication.up,
    down: migration_20260830_163500_retry_lovable_prototype_publication.down,
    name: '20260830_163500_retry_lovable_prototype_publication',
  },
]
