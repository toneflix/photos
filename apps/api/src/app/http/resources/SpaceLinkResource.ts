import { Space } from '@app/models/Space'
import { Resource } from 'resora'

/** The public space a photo or book sits in, to link to its page. Null for private spaces. */
export class SpaceLinkResource extends Resource {
  async data() {
    const space = this.resource

    if (!(space instanceof Space) || space.visibility !== 'public') return null

    return { id: space.id, name: space.name, slug: space.slug }
  }
}
