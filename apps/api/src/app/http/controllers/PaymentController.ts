import { BaseController } from './BaseController'
import { Checkout } from '@app/services/payments/Checkout'
import { Flutterwave } from '@app/services/payments/Flutterwave'
import { Payment } from '@app/models/Payment'
import { PaymentResource } from '@app/http/resources/PaymentResource'
import { RelayWebhook } from '@app/services/payments/RelayWebhook'
import { abortIf } from '@arkstack/common'

/** Paying for time on a plan through the provider's hosted checkout. */
export default class PaymentController extends BaseController {
  /** Start a payment and return the checkout page to send the payer to. */
  async create() {
    const data = await this.validate({
      plan: 'required|string|max:100',
      cycles: 'nullable|integer|min:1|max:120',
    })

    const { payment, url } = await new Checkout().start(this.user, { plan: String(data.plan), cycles: data.cycles }, this.country())

    return new PaymentResource(payment).withCheckout(url).additional({ status: 'success', message: 'Payment started', code: 201 }).response().setStatusCode(201)
  }

  /** Check a payment with the provider, e.g. when the payer comes back from the checkout. */
  async verify() {
    const pending = await this.user.payments().where({ reference: String(this.params.reference) }).firstOrFail()
    const payment = await new Checkout().verify(pending)

    return new PaymentResource(payment).additional({ status: 'success', message: payment.status === 'complete' ? 'Payment received' : 'OK', code: 200 })
  }

  /** Flutterwave tells us about payments here, through the payment relay. Each one is checked with Flutterwave before it counts. */
  async flutterwave() {
    const gateway = new Flutterwave()

    abortIf(!RelayWebhook.accepts(this.ctx.req.rawBody, this.ctx.req.get(RelayWebhook.header)), 'Webhooks are accepted only from the payment relay.', 401)
    abortIf(!gateway.validWebhook(this.ctx.req.get('verif-hash')), 'Invalid signature.', 401)

    const event = String(this.body.event ?? this.body['event.type'] ?? '').toLowerCase()
    const reference = this.body.data?.tx_ref ?? this.body.txRef

    if (event.startsWith('charge') && reference) {
      const payment = await Payment.query().where({ reference: String(reference), provider: gateway.key }).first()

      if (payment) await new Checkout(gateway).verify(payment)
    }

    return this.ctx.res.status(200).json({ status: 'ok' })
  }
}
