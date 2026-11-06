import { BaseController } from '../BaseController'
import { Permission } from '@app/policies/Permission'
import { Role } from '@app/models/Role'
import { RoleCollection } from '@app/http/resources/RoleCollection'
import { RoleResource } from '@app/http/resources/RoleResource'
import { regex } from 'kanun'

const PERMISSION = `in:${Permission.names().join(',')}`
const SLUG = regex(Role.SLUG)

/** Admins make roles out of permissions and give them to accounts. */
export default class RoleController extends BaseController {
  /** Every role, built-in ones first, with the permissions there are to choose from. */
  async index() {
    const roles = (await Role.query().get()).all().sort((a, b) => Number(b.isSystem) - Number(a.isSystem) || a.name.localeCompare(b.name))

    return new RoleCollection(roles).additional({ status: 'success', message: 'OK', code: 200, permissions: Permission.ALL })
  }

  async create() {
    const data = await this.validate({
      name: 'required|string|max:60',
      slug: ['nullable', 'string', 'min:2', 'max:40', SLUG, 'unique:roles,slug'],
      description: 'nullable|string|max:200',
      permissions: 'present|array',
      'permissions.*': PERMISSION,
    })

    const role = await Role.open(data)

    return new RoleResource(role).additional({ status: 'success', message: 'Role created', code: 201 }).response().setStatusCode(201)
  }

  async update() {
    const role = await Role.query().findOrFail(String(this.params.role))
    const data = await this.validate({
      name: 'nullable|string|max:60',
      description: 'nullable|string|max:200',
      permissions: 'nullable|array',
      'permissions.*': PERMISSION,
    })

    await role.revise({ name: data.name, description: data.description, permissions: data.permissions ?? undefined })

    return new RoleResource(role).additional({ status: 'success', message: 'Role saved', code: 200 })
  }

  async destroy() {
    const role = await Role.query().findOrFail(String(this.params.role))

    await role.remove()

    return new RoleResource(role).additional({ status: 'success', message: 'Role deleted', code: 200 })
  }
}
