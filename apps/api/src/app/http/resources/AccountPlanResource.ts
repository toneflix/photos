import type { Limits } from '@app/policies/Limits'
import { PlanResource } from './PlanResource'
import { Resource } from 'resora'

/** The signed-in account's plan: what it includes, what is used, and when paid time runs out. */
export class AccountPlanResource extends Resource {
  async data() {
    const limits = this.resource as Limits
    const user = limits.user!
    const current = await user.subscriptions().scope('current').first()
    const paidUntil = await (await user.subscriptions().scope('open').getQuery()).max('endsAt')

    return {
      premium: !!current,
      endsAt: current ? paidUntil : null,
      plan: await new PlanResource(limits.plan).data(),
      features: Object.fromEntries((await limits.plan.allFeatures()).map((feature) => [feature.key, feature.value])),
      usage: {
        storage: await limits.storage(),
        books: await user.books().count(),
        spaces: await user.spaces().count(),
      },
    }
  }
}
