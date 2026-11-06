import { PublicSpaceResource } from './PublicSpaceResource'
import { SpaceAccess } from '@app/policies/SpaceAccess'
import type { SpaceMember } from '@app/models/SpaceMember'
import { Resource } from 'resora'

/** A space the signed-in user joined, as its card shows it, with what their membership lets them do. Expects `space.user` and `user` to be loaded. */
export class SharedSpaceResource extends Resource {
  async data() {
    const membership = this.resource as SpaceMember
    const space = membership.getAttribute('space')!
    const access = new SpaceAccess(space, membership.getAttribute('user') ?? null, membership)

    return {
      ...(await new PublicSpaceResource(space).for(access).data()),
      membershipId: membership.id,
      joinedAt: membership.acceptedAt,
    }
  }
}
