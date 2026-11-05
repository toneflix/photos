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

    return {
      ...(await super.data()),
      owner: await new OwnerResource((space.getAttribute('user' as never) as User | null) ?? {}).data(),
      canEdit: space.isOwnedBy(this.viewer),
    }
  }
}
