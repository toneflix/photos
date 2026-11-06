import { ContentStats } from '@app/services/ContentStats'
import { OwnerResource } from './OwnerResource'
import type { Space } from '@app/models/Space'
import type { SpaceAccess } from '@app/policies/SpaceAccess'
import { SpaceResource } from './SpaceResource'

/** A space as visitors and members see it: only public photos and books count. Expects the `user` relation to be loaded. */
export class PublicSpaceResource extends SpaceResource {
  protected override everything = false
  private access: SpaceAccess | null = null

  for(access: SpaceAccess) {
    this.access = access

    return this
  }

  async data() {
    const space = this.resource as Space
    const owner = space.getAttribute('user')
    const viewer = this.access?.viewer ?? null

    return {
      ...(await super.data()),
      owner: await new OwnerResource(owner ?? {}).data(),
      stats: ContentStats.shown(space, owner, viewer),
      canEdit: space.isOwnedBy(viewer),
      permissions: this.access?.permissions() ?? ['view'],
    }
  }
}
