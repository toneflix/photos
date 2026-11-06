import type { Photo } from '@app/models/Photo'
import { Resource } from 'resora'

export class PhotoResource extends Resource {
  async data() {
    const photo = this.resource as Photo

    return {
      id: photo.id,
      userId: photo.userId,
      spaceId: photo.spaceId,
      url: await photo.url(),
      thumbnailUrl: null,
      width: photo.width,
      height: photo.height,
      mimeType: photo.mimeType,
      size: photo.size,
      caption: photo.caption,
      takenAt: photo.takenAt,
      visibility: photo.visibility,
      publishedAt: photo.publishedAt,
      license: photo.license,
      downloads: photo.downloadSizes(),
      createdAt: photo.createdAt,
      updatedAt: photo.updatedAt,
    }
  }
}
