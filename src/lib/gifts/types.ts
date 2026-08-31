export const giftBudgetIds = ['under_30', '30_to_75', '75_to_150', '150_to_300', 'mixed'] as const

export type GiftBudgetId = (typeof giftBudgetIds)[number]

export const giftThemeIds = [
  'build_fuel',
  'desk_life',
  'books_ideas',
  'off_screen',
  'wildcard',
  'mixed',
] as const

export type GiftThemeId = (typeof giftThemeIds)[number]

export type GiftBudget = {
  description: string
  id: GiftBudgetId
  label: string
  maximumCents: number
  minimumCents: number
}

export const giftBudgets: readonly GiftBudget[] = [
  {
    description: 'Small, useful, and surprising.',
    id: 'under_30',
    label: 'Under $30',
    maximumCents: 3_000,
    minimumCents: 1_000,
  },
  {
    description: 'A thoughtful everyday upgrade.',
    id: '30_to_75',
    label: '$30–$75',
    maximumCents: 7_500,
    minimumCents: 3_000,
  },
  {
    description: 'Something with staying power.',
    id: '75_to_150',
    label: '$75–$150',
    maximumCents: 15_000,
    minimumCents: 7_500,
  },
  {
    description: 'A serious piece of kit.',
    id: '150_to_300',
    label: '$150–$300',
    maximumCents: 30_000,
    minimumCents: 15_000,
  },
  {
    description: 'Let the deck roam from $15 to $300.',
    id: 'mixed',
    label: 'Mixed deck',
    maximumCents: 30_000,
    minimumCents: 1_500,
  },
] as const

export type GiftTheme = {
  description: string
  id: GiftThemeId
  label: string
}

export const giftThemes: readonly GiftTheme[] = [
  {
    description: 'Tools and objects that make building better.',
    id: 'build_fuel',
    label: 'Build fuel',
  },
  {
    description: 'Useful, considered upgrades for the workspace.',
    id: 'desk_life',
    label: 'Desk life',
  },
  {
    description: 'Books, references, and new lines of thought.',
    id: 'books_ideas',
    label: 'Books & ideas',
  },
  {
    description: 'A good reason to leave the keyboard behind.',
    id: 'off_screen',
    label: 'Off screen',
  },
  {
    description: 'A defensible surprise from outside the obvious lanes.',
    id: 'wildcard',
    label: 'Wildcard',
  },
  {
    description: 'A balanced deal across every lane.',
    id: 'mixed',
    label: 'Mix the lanes',
  },
] as const

export type GiftRecommendationRequest = {
  anonymousToken: string
  budget: GiftBudgetId
  theme: GiftThemeId
  variationSeed: string
}

export type GiftIdea = {
  category: string
  checkedAt: string
  currency: 'usd'
  id: string
  name: string
  observedPriceCents: number
  quoteToken: string
  retailer: string
  sourceUrl: string
  whyItFits: string
}

export type GiftRecommendationResponse = {
  disclaimer: string
  ideas: GiftIdea[]
  runId: string
  searchedAt: string
}

export type GiftCheckoutRequest = {
  quoteToken: string
}

export type GiftCheckoutResponse = {
  checkoutUrl: string
}

export const giftPaymentStatuses = [
  'pending',
  'paid',
  'partially_refunded',
  'refunded',
  'failed',
  'expired',
] as const

export type GiftPaymentStatus = (typeof giftPaymentStatuses)[number]

export type GiftPaymentStatusResponse = {
  paymentStatus: GiftPaymentStatus
}

export type GiftQuoteClaim = {
  amountCents: number
  category: string
  currency: 'usd'
  expiresAt: number
  issuedAt: number
  itemName: string
  offerId: string
  retailer: string
  runId: string
  sourceUrl: string
  version: 1
}

export function giftBudgetById(id: GiftBudgetId): GiftBudget {
  return giftBudgets.find((budget) => budget.id === id) ?? giftBudgets[0]
}

export function giftThemeById(id: GiftThemeId): GiftTheme {
  return giftThemes.find((theme) => theme.id === id) ?? giftThemes[0]
}
