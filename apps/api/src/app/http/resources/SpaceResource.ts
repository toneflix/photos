import { PhotoResource } from './PhotoResource'
import { Resource } from 'resora'
import type { Space } from '@app/models/Space'

/** A space with how much is in it and a few photos for its card, as its owner sees it: everything public plus their own private work. */
export class SpaceResource extends Resource {
  protected everything = true

  async data() {
    const space = this.resource as Space
    const ownerId = this.everything ? space.userId : null
    const previews = await space.contentPhotos(ownerId).latest('createdAt').take(4).getResults()

    return {
      id: space.id,
      userId: space.userId,
      name: space.name,
      slug: space.slug,
      description: space.description,
      visibility: space.visibility,
      publishedAt: space.publishedAt,
      photoCount: await space.contentPhotos(ownerId).count(),
      bookCount: await space.contentBooks(ownerId).count(),
      previews: await Promise.all(previews.all().map((photo) => new PhotoResource(photo).data())),
      createdAt: space.createdAt,
      updatedAt: space.updatedAt,
    }
  }
}
