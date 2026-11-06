import { AccountPlanResource } from '@app/http/resources/AccountPlanResource'
import { BaseController } from './BaseController'
import { Limits } from '@app/policies/Limits'
import { PaymentCollection } from '@app/http/resources/PaymentCollection'
import { Plan } from '@app/models/Plan'
import { PlanCollection } from '@app/http/resources/PlanCollection'
import { perPage } from '@arkstack/common'

/** Plans on offer, and the plan the signed-in account is on. */
export default class PlanController extends BaseController {
  /** Plans on offer, with prices in the visitor's currency where their region has one. */
  async index() {
    const plans = await Plan.scope('onOffer').get()

    return new PlanCollection(plans.all()).from(this.country()).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async mine() {
    const limits = await Limits.for(this.user)

    return new AccountPlanResource(limits).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** The account's payments for plans, newest first. */
  async payments() {
    const payments = await this.user.payments().latest('createdAt').paginate(perPage(this.query, { perPage: 20, maxPerPage: 100 }))

    return new PaymentCollection(payments).additional({ status: 'success', message: 'OK', code: 200 })
  }
}
