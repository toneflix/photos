import { Feature, type FeatureDefinition, type FeatureKey, type FeatureValue } from '@app/policies/Feature'
import { Cache } from '@arkstack/cache'
import { Model } from '@arkstack/database'
import type { QueryBuilder } from 'arkormx'
import { Subscription } from './Subscription'

export type PlanInterval = 'day' | 'week' | 'month' | 'year'

/** What a plan stores for one feature. Inactive features fall back to the free value; unlisted ones stay off the pricing copy. */
export interface PlanFeatureEntry {
  value: FeatureValue
  active: boolean
  listed: boolean
}

/** A way to pay for several cycles at once, e.g. 12 months at 20% off. */
export interface BillingOption {
  cycles: number
  discount: number
}

/** One feature of a plan, resolved for showing and checking. */
export interface PlanFeature extends PlanFeatureEntry {
  key: FeatureKey
  title: string
  description: string
  type: FeatureDefinition['type']
  unit: string | null
}

/**
 * A subscription plan. Its features say what it grants (toggles) and how far it goes
 * (limits, 0 = no limit). Accounts without an active subscription are on the default plan.
 */
export class Plan extends Model {
  declare id: string
  declare slug: string
  declare name: string
  declare description: string | null
  declare price: number
  declare currency: string
  declare interval: PlanInterval
  declare intervalCount: number
  declare billingOptions: BillingOption[] | null
  declare features: Partial<Record<FeatureKey, PlanFeatureEntry>>
  declare isDefault: boolean
  declare active: boolean
  declare isHidden: boolean
  declare sort: number
  declare createdAt: Date
  declare updatedAt: Date

  static readonly INTERVALS: PlanInterval[] = ['day', 'week', 'month', 'year']

  static readonly DEFAULT_CACHE_KEY = 'plans:default'
  static readonly LARGEST_PHOTO_CACHE_KEY = 'plans:largest-photo-mb'

  protected static override table = 'plans'

  protected static override columns = {
    intervalCount: 'interval_count',
    billingOptions: 'billing_options',
    isDefault: 'is_default',
    isHidden: 'is_hidden',
  }

  protected override casts = {
    price: 'number',
    intervalCount: 'number',
    billingOptions: 'json',
    features: 'json',
    isDefault: 'boolean',
    active: 'boolean',
    isHidden: 'boolean',
    sort: 'number',
  } as never

  subscriptions() {
    return this.hasMany(Subscription, 'planId')
  }

  /** The plan for accounts without an active subscription. With none marked default, every feature uses its fallback. */
  static async default(): Promise<Plan> {
    const id = await Cache.remember(Plan.DEFAULT_CACHE_KEY, 3600, async () => (await Plan.query().where({ isDefault: true }).first())?.id ?? null)
    const plan = id ? await Plan.query().find(id) : null

    return plan ?? new Plan({ slug: 'free', name: 'Free', price: 0, currency: 'NGN', features: {}, isDefault: true, active: true, isHidden: false })
  }

  /** Drop what is cached about plans, after one changes. */
  static async forget(): Promise<void> {
    await Cache.forget(Plan.DEFAULT_CACHE_KEY)
    await Cache.forget(Plan.LARGEST_PHOTO_CACHE_KEY)
  }

  /** Active plans anyone can see and buy, cheapest first. Hidden plans are only given by admins. */
  scopeOnOffer(query: QueryBuilder<Plan>): QueryBuilder<Plan> {
    return query.where({ active: true, isHidden: false }).orderBy([{ sort: 'asc' }, { price: 'asc' }])
  }

  /** What this plan stores for `key`, filled in with the defaults for anything it doesn't say. */
  entry(feature: FeatureDefinition): PlanFeatureEntry | null {
    const stored = this.features?.[feature.key]

    if (!stored) return null

    return {
      value: Feature.cast(feature, stored.value),
      active: stored.active !== false,
      listed: stored.listed !== false,
    }
  }

  /** What the plan gives for a feature: its own value while active, else the fallback. */
  async feature(key: FeatureKey): Promise<FeatureValue> {
    const feature = Feature.find(key)!
    const entry = this.entry(feature)

    return entry?.active ? entry.value : Feature.fallback(feature)
  }

  /** Every catalogue feature as this plan has it. */
  async allFeatures(): Promise<PlanFeature[]> {
    return Promise.all(
      Feature.ALL.map(async (feature) => {
        const entry = this.entry(feature)

        return {
          key: feature.key,
          title: feature.title,
          description: feature.description,
          type: feature.type,
          unit: feature.unit ?? null,
          value: entry?.active ? entry.value : await Feature.fallback(feature),
          active: entry?.active ?? false,
          listed: entry?.listed ?? true,
        }
      }),
    )
  }

  /** The features shown on pricing and plan pages. */
  async listedFeatures(): Promise<PlanFeature[]> {
    return (await this.allFeatures()).filter((feature) => feature.listed)
  }

  /** How long one payment lasts, e.g. `{ unit: 'month', count: 12 }` for 12 cycles of a monthly plan. */
  period(cycles = 1): { unit: PlanInterval; count: number } {
    return { unit: this.interval || 'month', count: Math.max(1, this.intervalCount || 1) * Math.max(1, cycles) }
  }

  /** When a period of `cycles` that starts at `from` ends. */
  endOf(from: Date, cycles = 1): Date {
    const { unit, count } = this.period(cycles)
    const ends = new Date(from)

    if (unit === 'day') ends.setDate(ends.getDate() + count)
    if (unit === 'week') ends.setDate(ends.getDate() + count * 7)
    if (unit === 'month') ends.setMonth(ends.getMonth() + count)
    if (unit === 'year') ends.setFullYear(ends.getFullYear() + count)

    return ends
  }

  /** One cycle at full price, then any bulk options, each with its price after discount. */
  billing(): Array<BillingOption & { price: number; saved: number }> {
    const options = [{ cycles: 1, discount: 0 }, ...(this.billingOptions ?? [])]
      .map((option) => ({ cycles: Math.max(1, Math.floor(Number(option.cycles) || 1)), discount: Math.min(100, Math.max(0, Number(option.discount) || 0)) }))
      .filter((option, index, all) => all.findIndex((other) => other.cycles === option.cycles) === index)
      .sort((a, b) => a.cycles - b.cycles)

    return options.map((option) => {
      const full = this.price * option.cycles
      const price = Math.round(full * (1 - option.discount / 100) * 100) / 100

      return { ...option, price, saved: Math.round((full - price) * 100) / 100 }
    })
  }

  isFree(): boolean {
    return !this.price || this.price <= 0
  }
}
