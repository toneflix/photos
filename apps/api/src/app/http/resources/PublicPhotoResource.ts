import { OwnerResource } from './OwnerResource'
import type { Space } from '@app/models/Space'
import { SpaceLinkResource } from './SpaceLinkResource'
import type { Photo } from '@app/models/Photo'
import { PhotoResource } from './PhotoResource'
import type { User } from '@app/models/User'

/** A photo on Explore, with who took it. Expects the `user` and `space` relations to be loaded. */
export class PublicPhotoResource extends PhotoResource {
  async data() {
    const photo = this.resource as Photo

    return {
      ...(await super.data()),
      owner: await new OwnerResource((photo.getAttribute('user' as never) as User | null) ?? {}).data(),
      space: await new SpaceLinkResource((photo.getAttribute('space' as never) as Space | null) ?? {}).data(),
    }
  }
}
