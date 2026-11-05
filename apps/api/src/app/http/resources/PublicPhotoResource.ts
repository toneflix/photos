import { OwnerResource } from './OwnerResource'
import type { Photo } from '@app/models/Photo'
import { PhotoResource } from './PhotoResource'
import type { User } from '@app/models/User'

/** A photo on Explore, with who took it. Expects the `user` relation to be loaded. */
export class PublicPhotoResource extends PhotoResource {
  async data() {
    const photo = this.resource as Photo

    return {
      ...(await super.data()),
      owner: await new OwnerResource((photo.getAttribute('user' as never) as User | null) ?? {}).data(),
    }
  }
}
