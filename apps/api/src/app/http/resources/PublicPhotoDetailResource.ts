import { ContentStats } from '@app/services/ContentStats'
import type { Photo } from '@app/models/Photo'
import { PublicPhotoResource } from './PublicPhotoResource'
import type { User } from '@app/models/User'

/** One public photo, plus the owner's public books it appears in so it can open there, and its counts when shown. */
export class PublicPhotoDetailResource extends PublicPhotoResource {
  private viewer: User | null = null

  for(viewer: User | null) {
    this.viewer = viewer

    return this
  }

  async data() {
    const photo = this.resource as Photo
    const books = await photo.publicBooks()

    return {
      ...(await super.data()),
      stats: ContentStats.shown(photo, photo.getAttribute('user'), this.viewer),
      books: books.map(({ book, page }) => ({ id: book.id, title: book.title, theme: book.theme, page })),
    }
  }
}
