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
  | 'access_codes'
  | 'transfer_codes'
  | 'premium_covers'
  | 'premium_layouts'
  | 'custom_kicker'
  | 'brand_imprint'
  | 'custom_imprint'
  | 'book_zip'
  | 'original_downloads'
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

/** A plan as admins see it, with every feature and who is on it now. */
export interface AdminPlan extends Omit<Plan, 'features' | 'chargeCurrency' | 'billing'> {
  billingOptions: Array<{ cycles: number; discount: number }>
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
  billingOptions?: Array<{ cycles: number; discount: number }>
  isDefault?: boolean
  active?: boolean
  isHidden?: boolean
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

/** One line of a plan's feature list, and whether the plan includes it. */
export function featureLine(feature: PlanFeature): { text: string; included: boolean } {
  if (feature.type === 'toggle') return { text: feature.title, included: !!feature.value }

  return { text: `${feature.title}: ${limitLabel(feature)}`, included: true }
}

/** Bytes as people read them. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${Math.round((bytes / 1024 ** 3) * 10) / 10} GB`
  if (bytes >= 1024 ** 2) return `${Math.round((bytes / 1024 ** 2) * 10) / 10} MB`

  return `${Math.max(0, Math.round(bytes / 1024))} KB`
}
