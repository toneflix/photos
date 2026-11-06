import { ContentStats } from '@app/services/ContentStats'
import { OwnerResource } from './OwnerResource'
import type { Space } from '@app/models/Space'
import { SpaceResource } from './SpaceResource'
import type { User } from '@app/models/User'

/** A space as visitors see it: only public photos and books count. Expects the `user` relation to be loaded. */
export class PublicSpaceResource extends SpaceResource {
  protected override everything = false
  private viewer: User | null = null

  for(viewer: User | null) {
    this.viewer = viewer

    return this
  }

  async data() {
    const space = this.resource as Space
    const owner = space.getAttribute('user' as never) as User | null

    return {
      ...(await super.data()),
      owner: await new OwnerResource(owner ?? {}).data(),
      stats: ContentStats.shown(space, owner, this.viewer),
      canEdit: space.isOwnedBy(this.viewer),
    }
  }
}
