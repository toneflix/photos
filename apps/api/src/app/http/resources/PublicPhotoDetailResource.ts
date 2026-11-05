import type { Photo } from '@app/models/Photo'
import { PublicPhotoResource } from './PublicPhotoResource'

/** One public photo, plus the owner's public books it appears in so it can open there. */
export class PublicPhotoDetailResource extends PublicPhotoResource {
  async data() {
    const photo = this.resource as Photo
    const books = await photo.publicBooks()

    return {
      ...(await super.data()),
      books: books.map(({ book, page }) => ({ id: book.id, title: book.title, theme: book.theme, page })),
    }
  }
}
