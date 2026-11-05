import type { Book } from '@app/models/Book'
import { BookResource } from './BookResource'
import { OwnerResource } from './OwnerResource'
import type { Space } from '@app/models/Space'
import { SpaceLinkResource } from './SpaceLinkResource'
import type { User } from '@app/models/User'

/** A book on Explore, with who made it. Expects the `user` and `space` relations to be loaded. */
export class PublicBookResource extends BookResource {
  async data() {
    const book = this.resource as Book

    return {
      ...(await super.data()),
      owner: await new OwnerResource((book.getAttribute('user' as never) as User | null) ?? {}).data(),
      space: await new SpaceLinkResource((book.getAttribute('space' as never) as Space | null) ?? {}).data(),
    }
  }
}
