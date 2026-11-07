import { Exchange, ExchangeRateApi, FrankfurterApi } from '@toneflix/money'
import { Cache } from '@arkstack/cache'
import type { CurrencyCode } from '@toneflix/money/types'
import { ValidationException } from 'kanun'

/** Live exchange rates through @toneflix/money, kept in the cache for a few hours. */
export class ExchangeRates {
  static readonly PROVIDERS = {
    'exchangerate-api': ExchangeRateApi,
    frankfurter: FrankfurterApi,
  }

  /** How much one unit of `from` is worth in `to`. */
  static async rate(from: string, to: string): Promise<number> {
    from = from.toUpperCase()
    to = to.toUpperCase()

    if (from === to) return 1

    const provider = String(config('payments.exchange_rates.provider'))
    const hours = Number(config('payments.exchange_rates.hours') ?? 6)
    const key = `exchange-rates:${provider}:${from}:${to}`
    const rate = await Cache.remember(key, hours * 3600, async () => {
      Exchange.setProvider(ExchangeRates.PROVIDERS[provider as keyof typeof ExchangeRates.PROVIDERS] ?? FrankfurterApi)

      if (config('payments.exchange_rates.key')) Exchange.setApiKey(String(config('payments.exchange_rates.key')))

      return Number(await Exchange.from(from as CurrencyCode).to(to as CurrencyCode).rate()) || 0
    }).catch(() => 0)

    if (rate > 0) return rate

    await Cache.forget(key)

    throw ValidationException.withMessages({ currency: `Payments in ${to} are not available right now.` })
  }
}
