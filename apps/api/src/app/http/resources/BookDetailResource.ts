import type { Book } from '@app/models/Book'
import type { BookAccess } from '@app/policies/BookAccess'
import { BookResource } from './BookResource'
import { ContentStats } from '@app/services/ContentStats'
import { Photo } from '@app/models/Photo'
import { Limits } from '@app/policies/Limits'
import { PhotoResource } from './PhotoResource'

/** A book with every page and its photos, as the viewer and editor open it. */
export class BookDetailResource extends BookResource {
  private access: BookAccess | null = null

  /** Shape the book for one visitor's access. */
  for(access: BookAccess) {
    this.access = access

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
        frame: page.frame,
        caption: page.caption,
        photos: page.placements().flatMap(({ id, frame, position }) => (serialized.has(id) ? [{ ...serialized.get(id), frame, position }] : [])),
      })),
      canEdit: !!this.access?.can('edit'),
      canDownload: this.access ? await this.access.canDownload(photos) : false,
      pageDownloads: this.access ? await this.access.pageDownloads() : { pdf: false, images: false },
      isOwner: !!this.access?.isOwner,
      permissions: this.access?.permissions() ?? ['view'],
      stats: ContentStats.shown(book, owner, this.access?.viewer ?? null),
      owner: { id: book.userId, name: owner && (owner.showOwnerName || this.access?.isOwner) ? owner.name : '' },
      ...(book.isMadeBy(this.access?.viewer ?? null)
        ? {
            customBranding: { kicker: book.kicker, brand: book.brand, imprint: book.imprint },
            brandingAllowed: await (await Limits.for(this.access!.viewer)).brandingAllowed(),
          }
        : {}),
    }
  }
}
