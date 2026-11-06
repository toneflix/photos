import type { Payment } from '@app/models/Payment'
import { Resource } from 'resora'

/** One payment for time on a plan, as its payer sees it. */
export class PaymentResource extends Resource {
  private checkoutUrl: string | null = null

  /** Include the page the payer finishes the payment on. */
  withCheckout(url: string) {
    this.checkoutUrl = url

    return this
  }

  async data() {
    const payment = this.resource as Payment

    return {
      id: payment.id,
      reference: payment.reference,
      title: payment.title,
      planSlug: payment.planSlug,
      cycles: payment.cycles,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      chargeAmount: payment.chargeAmount,
      chargeCurrency: payment.chargeCurrency,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      ...(this.checkoutUrl ? { checkoutUrl: this.checkoutUrl } : {}),
    }
  }
}
