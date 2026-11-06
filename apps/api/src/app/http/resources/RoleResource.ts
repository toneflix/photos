import type { Role } from '@app/models/Role'
import { Resource } from 'resora'

/** A role with what it allows and how many accounts have it. */
export class RoleResource extends Resource {
  async data() {
    const role = this.resource as Role

    return {
      id: role.id,
      slug: role.slug,
      name: role.name,
      description: role.description,
      permissions: role.grantedPermissions(),
      system: role.isSystem,
      userCount: await role.users().count(),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }
  }
}
