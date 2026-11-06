import type { SpaceMember } from '@app/models/SpaceMember'
import { Resource } from 'resora'

/** An invite as the invited person sees it: which space, from whom, and what it would let them do. Expects `space` and `invitedBy` to be loaded. */
export class SpaceInviteResource extends Resource {
  async data() {
    const invite = this.resource as SpaceMember
    const space = invite.getAttribute('space')
    const inviter = invite.getAttribute('invitedBy')

    return {
      id: invite.id,
      permissions: invite.permissions,
      space: space ? { id: space.id, name: space.name, slug: space.slug, description: space.description } : null,
      invitedBy: inviter ? { name: inviter.name, avatarUrl: await inviter.avatarUrl() } : null,
      invitedAt: invite.createdAt,
    }
  }
}
