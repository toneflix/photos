import type { Book } from '@app/models/Book'
import { BookResource } from './BookResource'
import { Photo } from '@app/models/Photo'
import { PhotoResource } from './PhotoResource'
import type { User } from '@app/models/User'

/** A book with every page and its photos, as the viewer and editor open it. */
export class BookDetailResource extends BookResource {
  private viewer: User | null = null

  for(viewer: User | null) {
    this.viewer = viewer

    return this
  }

  async data() {
    const book = this.resource as Book
    const pages = await book.orderedPages()
    const owner = await book.user().first()

    const ids = [...new Set(pages.flatMap((page) => page.photoIds ?? []))]
    const photos = ids.length ? (await Photo.query().whereIn('id', ids as never).get()).all() : []
    const serialized = new Map(
      await Promise.all(photos.map(async (photo) => [photo.id, await new PhotoResource(photo).data()] as const)),
    )

    return {
      ...(await super.data()),
      pages: pages.map((page) => ({
        id: page.id,
        bookId: page.bookId,
        position: page.position,
        layout: page.layout,
        caption: page.caption,
        photos: (page.photoIds ?? []).flatMap((id) => serialized.get(id) ?? []),
      })),
      canEdit: book.isOwnedBy(this.viewer),
      owner: { id: book.userId, name: owner?.name ?? '' },
    }
  }
}
