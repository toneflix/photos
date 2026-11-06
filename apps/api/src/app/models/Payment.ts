import { Model } from '@arkstack/database'
import { Plan } from './Plan'
import { User } from './User'

export type PaymentStatus = 'pending' | 'complete' | 'rejected'

/**
 * One payment for time on a plan. `amount` is the price in the plan currency;
 * `chargeAmount` is what the payer was asked for in their region's currency.
 */
export class Payment extends Model {
  declare id: string
  declare userId: string
  declare planId: string | null
  declare planSlug: string
  declare title: string
  declare cycles: number
  declare reference: string
  declare provider: string
  declare status: PaymentStatus
  declare amount: number
  declare currency: string
  declare chargeAmount: number
  declare chargeCurrency: string
  declare exchangeRate: number
  declare response: Record<string, unknown> | null
  declare paidAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'payments'

  protected static override columns = {
    userId: 'user_id',
    planId: 'plan_id',
    planSlug: 'plan_slug',
    chargeAmount: 'charge_amount',
    chargeCurrency: 'charge_currency',
    exchangeRate: 'exchange_rate',
    paidAt: 'paid_at',
  }

  protected override casts = {
    cycles: 'number',
    amount: 'number',
    chargeAmount: 'number',
    exchangeRate: 'number',
    response: 'json',
    paidAt: 'datetime',
  } as never

  user() {
    return this.belongsTo(User, 'userId')
  }

  plan() {
    return this.belongsTo(Plan, 'planId')
  }

  isPending(): boolean {
    return this.status === 'pending'
  }
}
