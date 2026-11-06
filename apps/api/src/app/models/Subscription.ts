import { Model } from '@arkstack/database'
import { Plan } from './Plan'
import { User } from './User'
import { type QueryBuilder, where } from 'arkormx'

/** A period an account spends on a paid plan, paid for or given by an admin. Paying again before it ends adds time after it. */
export class Subscription extends Model {
  declare id: string
  declare userId: string
  declare planId: string | null
  declare planSlug: string
  declare amount: number
  declare currency: string
  declare reference: string | null
  declare startsAt: Date
  declare endsAt: Date
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'subscriptions'

  protected static override columns = {
    userId: 'user_id',
    planId: 'plan_id',
    planSlug: 'plan_slug',
    startsAt: 'starts_at',
    endsAt: 'ends_at',
  }

  protected override casts = {
    amount: 'number',
    startsAt: 'datetime',
    endsAt: 'datetime',
  } as never

  user() {
    return this.belongsTo(User, 'userId')
  }

  plan() {
    return this.belongsTo(Plan, 'planId')
  }

  /** The period running now. */
  scopeCurrent(query: QueryBuilder<Subscription>): QueryBuilder<Subscription> {
    const now = new Date()

    return query
      .where(where('startsAt', '<=', now))
      .where(where('endsAt', '>', now))
      .latest('startsAt')
  }

  /** Periods that haven't ended, including ones paid in advance. */
  scopeOpen(query: QueryBuilder<Subscription>): QueryBuilder<Subscription> {
    return query.where(where('endsAt', '>', new Date()))
  }
}
