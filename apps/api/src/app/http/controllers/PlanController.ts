import { AccountPlanResource } from '@app/http/resources/AccountPlanResource'
import { BaseController } from './BaseController'
import { Limits } from '@app/policies/Limits'
import { Plan } from '@app/models/Plan'
import { PlanCollection } from '@app/http/resources/PlanCollection'

/** Plans on offer, and the plan the signed-in account is on. */
export default class PlanController extends BaseController {
  async index() {
    const plans = await Plan.scope('onOffer').get()

    return new PlanCollection(plans.all()).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async mine() {
    const limits = await Limits.for(this.user)

    return new AccountPlanResource(limits).additional({ status: 'success', message: 'OK', code: 200 })
  }
}
