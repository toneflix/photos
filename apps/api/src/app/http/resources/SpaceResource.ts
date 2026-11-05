import { PhotoResource } from './PhotoResource'
import { Resource } from 'resora'
import type { Space } from '@app/models/Space'

/** A space with how much is in it and a few photos for its card. Owners see everything they put in. */
export class SpaceResource extends Resource {
  protected everything = true

  async data() {
    const space = this.resource as Space
    const previews = await space.contentPhotos(this.everything).latest('createdAt').take(4).get()

    return {
      id: space.id,
      userId: space.userId,
      name: space.name,
      slug: space.slug,
      description: space.description,
      visibility: space.visibility,
      publishedAt: space.publishedAt,
      photoCount: await space.contentPhotos(this.everything).count(),
      bookCount: await space.contentBooks(this.everything).count(),
      previews: await Promise.all(previews.all().map((photo) => new PhotoResource(photo).data())),
      createdAt: space.createdAt,
      updatedAt: space.updatedAt,
    }
  }
}
