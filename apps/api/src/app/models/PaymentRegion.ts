import { Model } from '@arkstack/database'
import type { QueryBuilder } from 'arkormx'

export interface PaymentRegionDetails {
  name: string
  countries: string[]
  currency: string
  exchangeRate?: number | null
  rateMarkup?: number | null
  active?: boolean | null
}

/**
 * A group of countries that pays in its own currency. Prices are converted from the
 * plan currency at the region's fixed rate, or at the live rate plus its markup.
 */
export class PaymentRegion extends Model {
  declare id: string
  declare name: string
  declare countries: string[]
  declare currency: string
  declare exchangeRate: number | null
  declare rateMarkup: number
  declare active: boolean
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'payment_regions'

  protected static override columns = {
    exchangeRate: 'exchange_rate',
    rateMarkup: 'rate_markup',
  }

  protected override casts = {
    countries: 'json',
    exchangeRate: 'number',
    rateMarkup: 'number',
    active: 'boolean',
  } as never

  scopeActive(query: QueryBuilder<PaymentRegion>): QueryBuilder<PaymentRegion> {
    return query.where({ active: true })
  }

  /** The active region that lists `country`, if any. */
  static async covering(country: string): Promise<PaymentRegion | null> {
    const regions = await PaymentRegion.scope('active').oldest('createdAt').get()

    return regions.all().find((region) => region.covers(country)) ?? null
  }

  covers(country: string): boolean {
    return (this.countries ?? []).includes(country.toUpperCase())
  }
}
