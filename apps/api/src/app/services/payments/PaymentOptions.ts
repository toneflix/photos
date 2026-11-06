import { ceil, divide, multiply, round } from '@toneflix/money'
import type { PaymentRegion } from '@app/models/PaymentRegion'

/** How one payer pays: the currency they are charged in and its rate from the plan currency. */
export class PaymentOptions {
  constructor(
    readonly country: string | null,
    readonly currency: string,
    readonly rate = 1,
    readonly region: PaymentRegion | null = null,
  ) {}

  /** An amount in the plan currency, in the charge currency. Rounded up so the payer never pays less than the price. */
  charge(amount: number): number {
    return divide(ceil(round(multiply(multiply(amount, this.rate), 100), 4)), 100)
  }

  toJSON() {
    return {
      country: this.country,
      currency: this.currency,
      rate: this.rate,
      region: this.region ? { id: this.region.id, name: this.region.name } : null,
    }
  }
}
