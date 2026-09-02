import { after } from 'next/server'

import { giftBudgetIds } from '@/lib/gifts'
import { isGiftInventoryEnabled } from '@/lib/gifts/server/config'
import {
  handleGiftIdeas,
  handleGiftIdeasOptions,
  handleGiftIdeasStatus,
} from '@/lib/gifts/server/ideas-handler'
import {
  enqueueGiftInventoryReplenishment,
  getGiftInventoryDatabase,
  pruneGiftInventoryMaintenance,
  type GiftInventoryDatabase,
} from '@/lib/gifts/server/inventory'
import { drainGiftInventoryJobs } from '@/lib/gifts/server/inventory-worker'

export const dynamic = 'force-dynamic'
export const maxDuration = 300
export const runtime = 'nodejs'

const concreteBudgets = giftBudgetIds.filter((budget) => budget !== 'mixed')

function logGiftInventoryDrainResult(result: { processed: number; status: string }): void {
  try {
    console.info(
      JSON.stringify({
        component: 'gift_inventory_request_tail',
        event: 'drain_result',
        processed: result.processed,
        status: result.status,
      }),
    )
  } catch {
    // Request-tail telemetry is best effort.
  }
}

async function drainAndLogGiftInventoryJobs(
  database: GiftInventoryDatabase,
  maximumJobs: number,
): Promise<void> {
  const result = await drainGiftInventoryJobs({
    database,
    logger: (event) => {
      console.info(JSON.stringify({ component: 'gift_inventory_request_tail', ...event }))
    },
    maximumJobs,
  })
  logGiftInventoryDrainResult(result)
}

async function maintainBaselineInventory(): Promise<void> {
  if (!isGiftInventoryEnabled()) {
    logGiftInventoryDrainResult({ processed: 0, status: 'disabled' })
    return
  }

  const database = getGiftInventoryDatabase()
  for (const budget of concreteBudgets) {
    await enqueueGiftInventoryReplenishment(database, {
      budget,
      minimumAvailable: 9,
      theme: 'mixed',
    }).catch(() => 0)
  }
  await pruneGiftInventoryMaintenance(database).catch(() => undefined)
  await drainAndLogGiftInventoryJobs(database, 1)
}

async function runDrawMaintenance(task: () => Promise<void>): Promise<void> {
  await task()
  await drainAndLogGiftInventoryJobs(getGiftInventoryDatabase(), 1)
}

export async function OPTIONS(request: Request) {
  return handleGiftIdeasOptions(request)
}

export async function GET(request: Request) {
  const response = await handleGiftIdeasStatus(request)
  if (response.ok) after(maintainBaselineInventory)
  return response
}

export async function POST(request: Request) {
  return handleGiftIdeas(request, {
    scheduleMaintenance: (task) => after(() => runDrawMaintenance(task)),
  })
}
