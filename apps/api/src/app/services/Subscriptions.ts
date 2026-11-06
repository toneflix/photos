import type { Plan } from '@app/models/Plan'
import type { Subscription } from '@app/models/Subscription'
import type { User } from '@app/models/User'
import { where } from 'arkormx'

export interface PeriodDetails {
  cycles?: number
  amount?: number
  currency?: string
  reference?: string | null
}

/** The periods accounts spend on paid plans, whether paid for or given by an admin. */
export class Subscriptions {
  /** Add a period after any time the user already has. */
  static async extend(user: User, plan: Plan, details: PeriodDetails = {}): Promise<Subscription> {
    const paidUntil = await (await user.subscriptions().scope('open').getQuery()).max('endsAt')
    const startsAt = paidUntil ? new Date(paidUntil) : new Date()

    return user.subscriptions().create({
      planId: plan.id,
      planSlug: plan.slug,
      amount: details.amount ?? 0,
      currency: details.currency ?? plan.currency,
      reference: details.reference ?? null,
      startsAt,
      endsAt: plan.endOf(startsAt, details.cycles ?? 1),
    })
  }

  /** Put the user on a plan. More time on the plan they have is added after it; a different plan replaces it from now. */
  static async assign(user: User, plan: Plan, cycles = 1): Promise<Subscription> {
    const current = await user.subscriptions().scope('current').first()

    if (current?.planId !== plan.id) await Subscriptions.end(user)

    return Subscriptions.extend(user, plan, { cycles })
  }

  /** Stop the current period and any paid in advance, which puts the user back on the default plan. */
  static async end(user: User): Promise<number> {
    const now = new Date()
    const queued = await (await user.subscriptions().scope('open').getQuery())
      .where(where('startsAt', '>', now))
      .updateFrom({ startsAt: now, endsAt: now })
    const running = await (await user.subscriptions().scope('open').getQuery()).updateFrom({ endsAt: now })

    return queued + running
  }
}
