import { Cache } from '@arkstack/cache'
import { ValidationException } from 'kanun'

/** Live exchange rates, kept in the cache for a few hours. */
export class ExchangeRates {
  /** How much one unit of `from` is worth in `to`. */
  static async rate(from: string, to: string): Promise<number> {
    from = from.toUpperCase()
    to = to.toUpperCase()

    if (from === to) return 1

    const hours = Number(config('payments.exchange_rate_hours') ?? 6)
    const rates = await Cache.remember(`exchange-rates:${from}`, hours * 3600, async () => {
      const url = String(config('payments.exchange_rates_url')).replace('{from}', from)
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000) }).catch(() => null)
      const body = (await response?.json().catch(() => null)) as { rates?: Record<string, number> } | null

      return body?.rates ?? null
    })
    const rate = Number(rates?.[to] ?? 0)

    if (rate <= 0) {
      await Cache.forget(`exchange-rates:${from}`)

      throw ValidationException.withMessages({ currency: `Payments in ${to} are not available right now.` })
    }

    return rate
  }
}
