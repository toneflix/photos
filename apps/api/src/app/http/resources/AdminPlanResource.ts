import type { Plan } from '@app/models/Plan'
import { Resource } from 'resora'

/** A plan as admins edit it: every feature with whether it is on and listed, and who is on it now. */
export class AdminPlanResource extends Resource {
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
      billingOptions: plan.billingOptions ?? [],
      billing: plan.billing(),
      isDefault: plan.isDefault,
      active: plan.active,
      isHidden: plan.isHidden,
      sort: plan.sort,
      features: await plan.allFeatures(),
      subscriberCount: await plan.subscriptions().scope('current').count(),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    }
  }
}
