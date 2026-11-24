import type { Book } from '@app/models/Book'
import { PhotoResource } from './PhotoResource'
import { Resource } from 'resora'
import { Limits } from '@app/policies/Limits'

export class BookResource extends Resource {
  async data() {
    const book = this.resource as Book
    const cover = await book.coverPhoto()
    const maker = await book.brandedBy()

    return {
      id: book.id,
      userId: book.userId,
      creatorId: book.creatorId,
      spaceId: book.spaceId,
      title: book.title,
      description: book.description,
      coverPhotoId: book.coverPhotoId,
      coverPhoto: cover ? await new PhotoResource(cover).data() : null,
      coverPosition: book.coverPosition ?? null,
      visibility: book.visibility,
      publishedAt: book.publishedAt,
      theme: book.theme,
      coverDesign: book.coverDesign,
      coverText: book.coverText,
      paper: book.paper,
      frame: book.frame,
      allowDownloads: book.allowDownloads !== false,
      branding: await (await Limits.for(maker)).branding(book),
      pageCount: await book.pages().count(),
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
    }
  }
}
