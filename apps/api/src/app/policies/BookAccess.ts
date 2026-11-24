import { abortIf } from '@arkstack/common'
import type { Book } from '@app/models/Book'
import type { Photo } from '@app/models/Photo'
import { BookAccessCode, type BookPermission } from '@app/models/BookAccessCode'
import type { User } from '@app/models/User'
import { Limits } from './Limits'
import { SpaceAccess } from './SpaceAccess'

/**
 * What one visitor may do with one book. Owners may do everything; anyone may open
 * shared and public books; members who may edit the book's space can open, add to and
 * edit it; everything else comes from the access code they hold.
 */
export class BookAccess {
  /** What members with `edit` on the book's space may do with it. */
  static readonly SPACE_EDITOR: BookPermission[] = ['view', 'add', 'edit']

  constructor(
    readonly book: Book,
    readonly viewer: User | null,
    readonly code: BookAccessCode | null = null,
    readonly space: SpaceAccess | null = null,
  ) {}

  /** Resolve a visitor's access from their space membership and the code they sent, if any. `visitor` (their IP) is who wrong codes count against. */
  static async resolve(book: Book, viewer: User | null, visitor: string, code?: string | null): Promise<BookAccess> {
    const space = viewer && book.spaceId && !book.isOwnedBy(viewer) ? await book.space().first() : null
    const spaceAccess = space ? await SpaceAccess.resolve(space, viewer) : null

    return new BookAccess(book, viewer, await BookAccessCode.attempt(code, visitor, book.id), spaceAccess)
  }

  get isOwner(): boolean {
    return this.book.isOwnedBy(this.viewer)
  }

  can(permission: BookPermission): boolean {
    if (this.isOwner) return true
    if (permission === 'view' && this.book.visibility !== 'private') return true
    if (BookAccess.SPACE_EDITOR.includes(permission) && this.space?.can('edit')) return true

    return !!this.code?.allows(permission)
  }

  /** Whether this visitor may download a photo's original from the book: owners and transfer holders always, everyone else only under an open licence. */
  mayDownload(photo: Photo): boolean {
    return this.can('transfer') || photo.allowsDownload()
  }

  /** Whether the owner's download switch lets this visitor have the zip: when it is off, only the owner and transfer holders may. */
  get downloadsOpen(): boolean {
    return this.book.allowDownloads !== false || this.can('transfer')
  }

  /** Whether the whole book can be downloaded as a zip, which the owner's plan decides. */
  async mayDownloadBook(): Promise<boolean> {
    const owner = await this.book.user().first()

    return (await Limits.for(owner)).allows('book_zip')
  }

  /** Whether this visitor would get a zip with at least one photo in it, for clients to show the download button. */
  async canDownload(photos: Photo[]): Promise<boolean> {
    if (!this.downloadsOpen || !photos.some((photo) => this.mayDownload(photo))) return false

    return this.mayDownloadBook()
  }

  /** Every permission this visitor has, for clients to show the right controls. */
  permissions(): BookPermission[] {
    return BookAccessCode.PERMISSIONS.filter((permission) => this.can(permission))
  }

  /** Stop unless the visitor may do this. Books they can't open look missing. */
  authorize(permission: BookPermission): this {
    abortIf(!this.can('view'), 'Book not found!', 404)
    abortIf(!this.can(permission), 'This access code does not allow that.', 403)

    return this
  }
}
