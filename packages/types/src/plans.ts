import { Money, divide, round } from '@toneflix/money'
import type { CurrencyCode } from '@toneflix/money/types'

/** Every feature a plan can grant or limit. */
export type FeatureKey =
  | 'max_storage'
  | 'max_photo_size'
  | 'max_books'
  | 'max_book_pages'
  | 'max_spaces'
  | 'public_spaces'
  | 'space_members'
  | 'access_codes'
  | 'transfer_codes'
  | 'premium_covers'
  | 'premium_layouts'
  | 'custom_kicker'
  | 'brand_imprint'
  | 'custom_imprint'
  | 'book_zip'
  | 'original_downloads'
  | 'page_downloads'
  | 'custom_frames'
  | 'book_stats'
  | 'badge'

/** A toggle is on or off; a limit is a number where 0 means no limit. */
export type FeatureValue = boolean | number

export interface PlanFeature {
  key: FeatureKey
  title: string
  description: string
  type: 'toggle' | 'limit'
  unit: string | null
  value: FeatureValue
}

/** One way to pay: a number of billing periods at once and its price after discount. */
export interface PlanBilling {
  cycles: number
  discount: number
  /** The name admins gave this option, if any. */
  name: string | null
  /** What people see for this option: its name, else one made from the period, e.g. "Monthly" or "Quarterly". */
  label: string
  price: number
  saved: number
  /** The price in the payer's currency (`Plan.chargeCurrency`), which is what checkout charges. */
  charge: number
}

/** A plan as the pricing page shows it, with the features it lists. */
export interface Plan {
  id: string
  slug: string
  name: string
  description: string | null
  price: number
  currency: string
  interval: 'day' | 'week' | 'month' | 'year'
  intervalCount: number
  billing: PlanBilling[]
  /** The currency the visitor pays in: their payment region's, else the plan's. */
  chargeCurrency: string
  isDefault: boolean
  /** The one plan the pricing page draws attention to. */
  isHighlighted: boolean
  features: PlanFeature[]
}

/** The signed-in account's plan, every feature value, and what it uses. */
export interface AccountPlan {
  premium: boolean
  endsAt: string | null
  plan: Plan
  features: Record<FeatureKey, FeatureValue>
  usage: {
    storage: { used: number; limit: number }
    books: number
    spaces: number
  }
}

export type PlanInterval = Plan['interval']

/** A feature in the catalogue admins build plans from. */
export interface FeatureDefinition {
  key: FeatureKey
  title: string
  description: string
  type: 'toggle' | 'limit'
  unit?: string
  fallback: FeatureValue
  setting?: string
}

/** A plan's feature as admins edit it. Off features use the free value; unlisted ones stay off the pricing copy. */
export interface AdminPlanFeature extends PlanFeature {
  active: boolean
  listed: boolean
}

/** A way to pay for several periods at once, with an optional name such as "Yearly". */
export interface PlanBillingOption {
  cycles: number
  discount: number
  name?: string | null
}

/** A plan as admins see it, with every feature and who is on it now. */
export interface AdminPlan extends Omit<Plan, 'features' | 'chargeCurrency' | 'billing'> {
  billingOptions: PlanBillingOption[]
  billing: Array<Omit<PlanBilling, 'charge'>>
  active: boolean
  isHidden: boolean
  sort: number
  features: AdminPlanFeature[]
  subscriberCount: number
  createdAt: string
  updatedAt: string
}

/** What admins send to make or change a plan. Features left out keep what the plan has. */
export interface PlanInput {
  name?: string
  slug?: string | null
  description?: string | null
  price?: number
  currency?: string
  interval?: PlanInterval
  intervalCount?: number
  billingOptions?: PlanBillingOption[]
  isDefault?: boolean
  active?: boolean
  isHidden?: boolean
  isHighlighted?: boolean
  sort?: number
  features?: Partial<Record<FeatureKey, Partial<Pick<AdminPlanFeature, 'value' | 'active' | 'listed'>>>>
}

/** A group of countries that pays in its own currency, at a fixed rate or the live rate plus a markup. */
export interface PaymentRegion {
  id: string
  name: string
  countries: string[]
  currency: string
  exchangeRate: number | null
  rateMarkup: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export type PaymentRegionInput = Partial<Pick<PaymentRegion, 'name' | 'countries' | 'currency' | 'exchangeRate' | 'rateMarkup' | 'active'>>

export type PaymentStatus = 'pending' | 'complete' | 'rejected'

/** One payment for time on a plan. `amount` is in the plan currency; `chargeAmount` is what was charged. */
export interface Payment {
  id: string
  reference: string
  title: string
  planSlug: string
  cycles: number
  status: PaymentStatus
  amount: number
  currency: string
  chargeAmount: number
  chargeCurrency: string
  paidAt: string | null
  createdAt: string
  /** Only when a payment starts: the page the payer finishes it on. */
  checkoutUrl?: string
}

/** An amount in its currency through @toneflix/money, without decimals when it is a whole number. */
export function formatMoney(amount: number, currency: string): string {
  const code = currency.toUpperCase() as CurrencyCode

  return Number.isInteger(amount) ? Money.whole(amount, code) : Money.format(amount, code)
}

/** What one period of a billing option costs in the payer's currency, e.g. the monthly price of a yearly payment. */
export function chargePerCycle(option: Pick<PlanBilling, 'charge' | 'cycles'>): number {
  return round(divide(option.charge, Math.max(1, option.cycles)), 2)
}

/** How long `cycles` billing periods of a plan last, e.g. "month" or "12 months". */
export function periodLabel(plan: Pick<Plan, 'interval' | 'intervalCount'>, cycles = 1): string {
  const count = Math.max(1, plan.intervalCount || 1) * Math.max(1, cycles)

  return count === 1 ? plan.interval : `${count} ${plan.interval}s`
}

/** A limit as people read it: "Unlimited", "100 GB", "200 pages". */
export function limitLabel(feature: Pick<PlanFeature, 'type' | 'unit' | 'value'>): string {
  const value = Number(feature.value)

  if (!value) return 'Unlimited'
  if (feature.unit === 'MB') return value >= 1024 ? `${Math.round((value / 1024) * 10) / 10} GB` : `${value} MB`
  if (feature.unit === 'pages') return `${value.toLocaleString('en')} pages`

  return value.toLocaleString('en')
}

/** How each limit reads on a plan card: `amount` is the formatted limit, `one` is true when it is 1. */
const limitPhrases: Partial<Record<FeatureKey, { unlimited: string; limited: (amount: string, one: boolean) => string }>> = {
  max_storage: { unlimited: 'Unlimited photo storage', limited: (amount) => `${amount} of photo storage` },
  max_photo_size: { unlimited: 'Photos of any size', limited: (amount) => `Photos up to ${amount} each` },
  max_books: { unlimited: 'Unlimited photobooks', limited: (amount, one) => (one ? '1 photobook' : `Up to ${amount} photobooks`) },
  max_book_pages: { unlimited: 'Books of any length', limited: (amount) => `Up to ${amount} per book` },
  max_spaces: { unlimited: 'Unlimited spaces', limited: (amount, one) => (one ? '1 space' : `Up to ${amount} spaces`) },
  space_members: { unlimited: 'Unlimited members in each space', limited: (amount, one) => (one ? '1 member in each space' : `Up to ${amount} members in each space`) },
  access_codes: { unlimited: 'Unlimited access codes for each book', limited: (amount, one) => (one ? '1 access code for each book' : `Up to ${amount} access codes for each book`) },
}

/** One line of a plan's feature list, and whether the plan includes it. */
export function featureLine(feature: PlanFeature): { text: string; included: boolean } {
  if (feature.type === 'toggle') return { text: feature.title, included: !!feature.value }

  const value = Number(feature.value)
  const phrase = limitPhrases[feature.key]
  const title = feature.title.toLowerCase()

  if (!value) return { text: phrase?.unlimited ?? `Unlimited ${title}`, included: true }

  return { text: phrase?.limited(limitLabel(feature), value === 1) ?? `Up to ${limitLabel(feature)} ${title}`, included: true }
}

/** Bytes as people read them. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${Math.round((bytes / 1024 ** 3) * 10) / 10} GB`
  if (bytes >= 1024 ** 2) return `${Math.round((bytes / 1024 ** 2) * 10) / 10} MB`

  return `${Math.max(0, Math.round(bytes / 1024))} KB`
}
