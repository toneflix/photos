import type { SpaceMember } from '@app/models/SpaceMember'
import { Resource } from 'resora'

/** A member or open invite as the space's managers see it. Expects the `user` relation to be loaded. */
export class SpaceMemberResource extends Resource {
  async data() {
    const member = this.resource as SpaceMember
    const user = member.getAttribute('user')

    return {
      id: member.id,
      spaceId: member.spaceId,
      email: member.email,
      name: user?.name ?? null,
      avatarUrl: user ? await user.avatarUrl() : null,
      permissions: member.permissions,
      status: member.isPending() ? 'invited' : 'joined',
      invitedAt: member.createdAt,
      acceptedAt: member.acceptedAt,
    }
  }
}
