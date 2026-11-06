import type { User } from '@app/models/User'
import { Resource } from 'resora'

export class UserResource extends Resource {
  async data() {
    const user = this.resource as User

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.hasVerifiedEmail(),
      avatarUrl: await user.avatarUrl(),
      defaultVisibility: user.defaultVisibility,
      showOwnerName: user.showOwnerName,
      defaultLicense: user.defaultLicense,
      role: user.role ?? 'user',
      permissions: await user.permissions(),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
