import type { Plan } from '@app/models/Plan'
import { Resource } from 'resora'

/** A plan as the pricing page shows it: its prices and the features it lists. */
export class PlanResource extends Resource {
  async data() {
    const plan = this.resource as Plan

    return {
      id: plan.id,
      slug: plan.slug,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      interval: plan.interval,
      intervalCount: plan.intervalCount,
      billing: plan.billing(),
      isDefault: plan.isDefault,
      features: (await plan.listedFeatures()).map(({ key, title, description, type, unit, value }) => ({ key, title, description, type, unit, value })),
    }
  }
}
