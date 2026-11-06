import { Payment } from '@app/models/Payment'
import { Plan } from '@app/models/Plan'
import type { User } from '@app/models/User'
import { Flutterwave } from './Flutterwave'
import type { PaymentGateway, PaymentResult } from './PaymentGateway'
import { PaymentRegions } from './PaymentRegions'
import { Subscriptions } from '@app/services/Subscriptions'
import { ValidationException } from 'kanun'
import { randomBytes } from 'node:crypto'

/**
 * Turns "I want this plan for this long" into a pending payment on the provider's
 * checkout, and a confirmed payment into time on the plan.
 */
export class Checkout {
  constructor(readonly gateway: PaymentGateway = new Flutterwave()) {}

  /** Create a pending payment, in the currency of the payer's region, and the checkout page they finish it on. */
  async start(user: User, input: { plan: string; cycles?: number | null }, country: string | null): Promise<{ payment: Payment; url: string }> {
    const plan = await Plan.scope('onOffer').where({ slug: input.plan }).first()

    if (!plan || plan.isDefault || plan.isFree()) throw ValidationException.withMessages({ plan: 'Choose a paid plan.' })

    const billing = plan.billing().find((option) => option.cycles === Math.max(1, Number(input.cycles) || 1))

    if (!billing) throw ValidationException.withMessages({ cycles: `${plan.name} can't be paid for that many ${plan.interval}s at once.` })
    if (!this.gateway.enabled()) throw ValidationException.withMessages({ plan: 'Payments are not available right now.' })

    const options = await PaymentRegions.for(country, plan.currency)
    const { unit, count } = plan.period(billing.cycles)
    const title = `${plan.name}, ${count} ${unit}${count === 1 ? '' : 's'}`
    const reference = `${config('payments.reference_prefix')}${randomBytes(10).toString('hex').toUpperCase()}`
    const chargeAmount = options.charge(billing.price)
    const returnUrl = `${String(config('app.frontend_url')).replace(/\/+$/, '')}/checkout/complete?reference=${reference}`

    // Start with the provider first, so a failed start leaves no pending payment behind.
    const session = await this.gateway.initialize({ reference, amount: chargeAmount, currency: options.currency, email: user.email, name: user.name, title, returnUrl })
    const payment = await user.payments().create({
      planId: plan.id,
      planSlug: plan.slug,
      title,
      cycles: billing.cycles,
      reference,
      provider: this.gateway.key,
      status: 'pending',
      amount: billing.price,
      currency: plan.currency,
      chargeAmount,
      chargeCurrency: options.currency,
      exchangeRate: options.rate,
    })

    return { payment, url: session.url }
  }

  /** Ask the provider about a pending payment and settle it once it has an answer. */
  async verify(payment: Payment): Promise<Payment> {
    if (!payment.isPending()) return payment

    const result = await this.gateway.verify(payment.reference)

    if (!result.paid && !result.final) return payment

    return this.settle(payment, result)
  }

  /**
   * Record the provider's answer. Paying less than was charged, or in another currency, doesn't count.
   * Only the first answer for a payment is recorded, so a webhook and the return page can both call this.
   */
  async settle(payment: Payment, result: PaymentResult): Promise<Payment> {
    const wrongCurrency = !!result.currency && result.currency !== payment.chargeCurrency.toUpperCase()
    const status = result.paid && !wrongCurrency && result.amount + 0.001 >= payment.chargeAmount ? 'complete' : 'rejected'
    const paidAt = status === 'complete' ? new Date() : null

    await Payment.transaction(async () => {
      const claimed = await Payment.query().where({ id: payment.id, status: 'pending' }).updateFrom({ status, paidAt, response: result.raw })

      if (!claimed || status !== 'complete') return

      const plan = (await payment.plan().first()) ?? (await Plan.query().where({ slug: payment.planSlug }).first())
      const user = await payment.user().firstOrFail()

      if (plan) await Subscriptions.extend(user, plan, { cycles: payment.cycles, amount: payment.amount, currency: payment.currency, reference: payment.reference })
    })

    return Payment.query().findOrFail(payment.id)
  }
}
