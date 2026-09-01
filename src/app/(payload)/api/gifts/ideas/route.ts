import { after } from 'next/server'

import { giftBudgetIds } from '@/lib/gifts'
import { isGiftInventoryEnabled } from '@/lib/gifts/server/config'
import {
  handleGiftIdeas,
  handleGiftIdeasOptions,
  handleGiftIdeasStatus,
} from '@/lib/gifts/server/ideas-handler'
import {
  enqueueDueGiftInventoryRevalidation,
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

async function drainAndLogGiftInventoryJobs(
  database: GiftInventoryDatabase,
  maximumJobs: number,
): Promise<void> {
  await drainGiftInventoryJobs({
    database,
    logger: (event) => {
      console.info(JSON.stringify({ component: 'gift_inventory_request_tail', ...event }))
    },
    maximumJobs,
  })
}

async function maintainBaselineInventory(): Promise<void> {
  if (!isGiftInventoryEnabled()) return

  const database = getGiftInventoryDatabase()
  for (const budget of concreteBudgets) {
    await enqueueGiftInventoryReplenishment(database, {
      budget,
      minimumAvailable: 9,
      theme: 'mixed',
    }).catch(() => 0)
  }
  await Promise.allSettled([
    enqueueDueGiftInventoryRevalidation(database),
    pruneGiftInventoryMaintenance(database),
  ])
  await drainAndLogGiftInventoryJobs(database, 3)
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
