import type { Plan } from '@app/models/Plan'
import { PaymentRegions } from '@app/services/payments/PaymentRegions'
import { Resource } from 'resora'

/** A plan as the pricing page shows it: its prices, in the payer's currency too, and the features it lists. */
export class PlanResource extends Resource {
  private country: string | null = null

  /** Show prices for a payer in `country`. */
  from(country: string | null) {
    this.country = country

    return this
  }

  async data() {
    const plan = this.resource as Plan
    const options = await PaymentRegions.shown(this.country, plan.currency)

    return {
      id: plan.id,
      slug: plan.slug,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      interval: plan.interval,
      intervalCount: plan.intervalCount,
      billing: plan.billing().map((option) => ({ ...option, charge: options.charge(option.price) })),
      chargeCurrency: options.currency,
      isDefault: plan.isDefault,
      features: (await plan.listedFeatures()).map(({ key, title, description, type, unit, value }) => ({ key, title, description, type, unit, value })),
    }
  }
}
