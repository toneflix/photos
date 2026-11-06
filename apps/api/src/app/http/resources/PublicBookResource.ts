import type { Book } from '@app/models/Book'
import { BookResource } from './BookResource'
import { OwnerResource } from './OwnerResource'
import { SpaceLinkResource } from './SpaceLinkResource'

/** A book on Explore, with who made it. Expects the `user` and `space` relations to be loaded. */
export class PublicBookResource extends BookResource {
  async data() {
    const book = this.resource as Book

    return {
      ...(await super.data()),
      owner: await new OwnerResource(book.getAttribute('user') ?? {}).data(),
      space: await new SpaceLinkResource(book.getAttribute('space') ?? {}).data(),
    }
  }
}
