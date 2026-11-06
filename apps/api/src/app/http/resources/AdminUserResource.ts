import type { User } from '@app/models/User'
import { Resource } from 'resora'

/** An account as admins see it: role, standing and how much it holds. */
export class AdminUserResource extends Resource {
  async data() {
    const user = this.resource as User

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.hasVerifiedEmail(),
      avatarUrl: await user.avatarUrl(),
      role: user.role ?? 'user',
      suspended: user.isSuspended(),
      suspendedAt: user.suspendedAt,
      photoCount: await user.photos().count(),
      bookCount: await user.books().count(),
      createdAt: user.createdAt,
    }
  }
}
