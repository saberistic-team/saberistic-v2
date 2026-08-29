import * as migration_20260828_221439_initial_platform from './20260828_221439_initial_platform'
import * as migration_20260829_144500_seed_prepared_content from './20260829_144500_seed_prepared_content'

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
]
