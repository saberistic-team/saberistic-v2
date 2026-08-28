import * as migration_20260828_221439_initial_platform from './20260828_221439_initial_platform'

export const migrations = [
  {
    up: migration_20260828_221439_initial_platform.up,
    down: migration_20260828_221439_initial_platform.down,
    name: '20260828_221439_initial_platform',
  },
]
