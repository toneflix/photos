import { PaymentOptions } from './PaymentOptions'
import { PaymentRegion } from '@app/models/PaymentRegion'
import { ExchangeRates } from './ExchangeRates'
import { ValidationException } from 'kanun'

/**
 * Decides what currency each payer pays in. A country in an active region pays in that
 * region's currency; everyone else pays the plan price in the plan currency.
 */
export class PaymentRegions {
  /** The payer's two-letter country from what the request says, if it says. */
  static country(...hints: unknown[]): string | null {
    for (const hint of hints) {
      const code = String(hint ?? '')
        .trim()
        .toUpperCase()

      if (/^[A-Z]{2}$/.test(code) && !['XX', 'T1'].includes(code)) return code
    }

    return null
  }

  static async for(country: string | null, currency: string): Promise<PaymentOptions> {
    const region = country ? await PaymentRegion.covering(country) : null

    if (!region) return new PaymentOptions(country, currency)

    return new PaymentOptions(country, region.currency, await PaymentRegions.rate(region, currency), region)
  }

  /** What to show a payer before they pay: the plan's own currency while the region's rate can't be had. */
  static async shown(country: string | null, currency: string): Promise<PaymentOptions> {
    try {
      return await PaymentRegions.for(country, currency)
    } catch (error) {
      if (error instanceof ValidationException) return new PaymentOptions(country, currency)

      throw error
    }
  }

  /** How much one unit of `currency` is worth in the region's currency. */
  static async rate(region: PaymentRegion, currency: string): Promise<number> {
    if (region.currency.toUpperCase() === currency.toUpperCase()) return 1
    if (region.exchangeRate) return Number(region.exchangeRate)

    return (await ExchangeRates.rate(currency, region.currency)) * (1 + (Number(region.rateMarkup) || 0) / 100)
  }
}
