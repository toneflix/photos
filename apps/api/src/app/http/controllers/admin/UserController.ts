import { AdminUserCollection } from '@app/http/resources/AdminUserCollection'
import { AdminUserDetailResource } from '@app/http/resources/AdminUserDetailResource'
import { AdminUserResource } from '@app/http/resources/AdminUserResource'
import { BaseController } from '../BaseController'
import { Plan } from '@app/models/Plan'
import { Role } from '@app/models/Role'
import { Subscriptions } from '@app/services/Subscriptions'
import { User } from '@app/models/User'
import { abortIf, perPage } from '@arkstack/common'

/** Admins find accounts, change their role and suspend them. */
export default class UserController extends BaseController {
  async index() {
    const filters = await this.validateQuery({
      q: 'nullable|string|max:100',
      role: 'nullable|string|max:40',
      status: 'nullable|in:active,suspended',
    })

    const query = User.query()
    const text = filters.q?.trim()

    if (text) query.scope('matching', text)
    if (filters.role) query.where({ role: filters.role })
    if (filters.status === 'suspended') query.whereNotNull('suspendedAt')
    if (filters.status === 'active') query.whereNull('suspendedAt')

    const users = await query.latest('createdAt').paginate(perPage(this.query, { perPage: 25, maxPerPage: 100 }))

    return new AdminUserCollection(users).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** One account with its holdings and views and downloads per day. */
  async show() {
    const filters = await this.validateQuery({ days: 'nullable|integer|min:7|max:365' })
    const user = await User.query().findOrFail(String(this.params.user))

    return new AdminUserDetailResource(user)
      .over(Number(filters.days) || 30)
      .additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** Change an account's role or suspend it. Admins can't do either to themselves. */
  async update() {
    const user = await User.query().findOrFail(String(this.params.user))
    const data = await this.validate({
      role: 'nullable|string|max:40',
      suspended: 'nullable|boolean',
    })

    abortIf(user.id === this.user.id, 'You cannot change your own role or suspend yourself.', 422)

    if (data.role) {
      const role = await Role.query().where({ slug: data.role }).first()

      abortIf(!role, 'Pick a role that exists.', 422)

      await user.update({ role: role!.slug })
    }

    if (data.suspended === true || data.suspended === 'true') await user.suspend()
    if (data.suspended === false || data.suspended === 'false') await user.reinstate()

    return new AdminUserResource(user).additional({ status: 'success', message: 'Account updated', code: 200 })
  }

  /** Put an account on a plan without payment. The default plan ends any paid time. */
  async plan() {
    const user = await User.query().findOrFail(String(this.params.user))
    const data = await this.validate({
      plan: 'required|string|max:100',
      cycles: 'nullable|integer|min:1|max:120',
    })

    const plan = await Plan.query().where({ slug: String(data.plan) }).first()

    abortIf(!plan, 'Pick a plan that exists.', 422)

    if (plan!.isDefault) await Subscriptions.end(user)
    else await Subscriptions.assign(user, plan!, Number(data.cycles) || 1)

    return new AdminUserDetailResource(user).additional({ status: 'success', message: `${user.name} is on ${plan!.name}`, code: 200 })
  }
}
