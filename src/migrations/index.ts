import * as migration_20260828_221439_initial_platform from './20260828_221439_initial_platform'
import * as migration_20260829_144500_seed_prepared_content from './20260829_144500_seed_prepared_content'
import * as migration_20260829_151905 from './20260829_151905'
import * as migration_20260830_160500_publish_lovable_prototypes from './20260830_160500_publish_lovable_prototypes'
import * as migration_20260830_163500_retry_lovable_prototype_publication from './20260830_163500_retry_lovable_prototype_publication'
import * as migration_20260831_204405_architecture_diagnostic_funnel from './20260831_204405_architecture_diagnostic_funnel'
import * as migration_20260831_205708_gift_payments from './20260831_205708_gift_payments'
import * as migration_20260831_210012_diagnostic_report_one_time_key from './20260831_210012_diagnostic_report_one_time_key'
import * as migration_20260901_022500_gift_inventory from './20260901_022500_gift_inventory'
import * as migration_20260901_232312_gift_inventory_schema_snapshot from './20260901_232312_gift_inventory_schema_snapshot'

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
  {
    up: migration_20260831_204405_architecture_diagnostic_funnel.up,
    down: migration_20260831_204405_architecture_diagnostic_funnel.down,
    name: '20260831_204405_architecture_diagnostic_funnel',
  },
  {
    up: migration_20260831_205708_gift_payments.up,
    down: migration_20260831_205708_gift_payments.down,
    name: '20260831_205708_gift_payments',
  },
  {
    up: migration_20260831_210012_diagnostic_report_one_time_key.up,
    down: migration_20260831_210012_diagnostic_report_one_time_key.down,
    name: '20260831_210012_diagnostic_report_one_time_key',
  },
  {
    up: migration_20260901_022500_gift_inventory.up,
    down: migration_20260901_022500_gift_inventory.down,
    name: '20260901_022500_gift_inventory',
  },
  {
    up: migration_20260901_232312_gift_inventory_schema_snapshot.up,
    down: migration_20260901_232312_gift_inventory_schema_snapshot.down,
    name: '20260901_232312_gift_inventory_schema_snapshot',
  },
]
