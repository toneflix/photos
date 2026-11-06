import type { Book } from '@app/models/Book'
import { PhotoResource } from './PhotoResource'
import { Resource } from 'resora'

export class BookResource extends Resource {
  async data() {
    const book = this.resource as Book
    const cover = await book.coverPhoto()

    return {
      id: book.id,
      userId: book.userId,
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
      pageCount: await book.pages().count(),
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
    }
  }
}
