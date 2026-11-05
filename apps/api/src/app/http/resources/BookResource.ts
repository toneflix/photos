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
      title: book.title,
      description: book.description,
      coverPhotoId: book.coverPhotoId,
      coverPhoto: cover ? await new PhotoResource(cover).data() : null,
      visibility: book.visibility,
      theme: book.theme,
      paper: book.paper,
      pageCount: await book.pages().count(),
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
    }
  }
}
