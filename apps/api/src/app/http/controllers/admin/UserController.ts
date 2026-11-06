import { AdminUserCollection } from '@app/http/resources/AdminUserCollection'
import { AdminUserResource } from '@app/http/resources/AdminUserResource'
import { BaseController } from '../BaseController'
import type { QueryBuilder } from 'arkormx'
import { Role } from '@app/policies/Role'
import { User } from '@app/models/User'
import { abortIf, perPage } from '@arkstack/common'
import { matches } from '@app/support/search'

/** Admins find accounts, change their role and suspend them. */
export default class UserController extends BaseController {
  async index() {
    const filters = await this.validateQuery({
      q: 'nullable|string|max:100',
      role: `nullable|in:${Role.NAMES.join(',')}`,
      status: 'nullable|in:active,suspended',
    })

    const query = User.query()
    const text = filters.q?.trim()

    if (text) query.where((match: QueryBuilder<User>) => match.where(matches('name', text)).orWhere(matches('email', text)))
    if (filters.role) query.where({ role: filters.role })
    if (filters.status === 'suspended') query.whereNotNull('suspendedAt')
    if (filters.status === 'active') query.whereNull('suspendedAt')

    const users = await query.latest('createdAt').paginate(perPage(this.query, { perPage: 25, maxPerPage: 100 }))

    return new AdminUserCollection(users).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async show() {
    const user = await User.query().findOrFail(String(this.params.user))

    return new AdminUserResource(user).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** Change an account's role or suspend it. Admins can't do either to themselves. */
  async update() {
    const user = await User.query().findOrFail(String(this.params.user))
    const data = await this.validate({
      role: `nullable|in:${Role.NAMES.join(',')}`,
      suspended: 'nullable|boolean',
    })

    abortIf(user.id === this.user.id, 'You cannot change your own role or suspend yourself.', 422)

    if (data.role) await user.update({ role: data.role })
    if (data.suspended === true || data.suspended === 'true') await user.suspend()
    if (data.suspended === false || data.suspended === 'false') await user.reinstate()

    return new AdminUserResource(user).additional({ status: 'success', message: 'Account updated', code: 200 })
  }
}
