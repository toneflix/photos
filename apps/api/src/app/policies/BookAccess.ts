import { abortIf } from '@arkstack/common'
import type { Book } from '@app/models/Book'
import { BookAccessCode, type BookPermission } from '@app/models/BookAccessCode'
import type { User } from '@app/models/User'

/**
 * What one visitor may do with one book. Owners may do everything; anyone may open
 * shared and public books; everything else comes from the access code they hold.
 */
export class BookAccess {
  constructor(
    readonly book: Book,
    readonly viewer: User | null,
    readonly code: BookAccessCode | null = null,
  ) {}

  /** Resolve a visitor's access, looking up the code they sent if any. */
  static async resolve(book: Book, viewer: User | null, code?: string | null): Promise<BookAccess> {
    return new BookAccess(book, viewer, await BookAccessCode.findUsable(code, book.id))
  }

  get isOwner(): boolean {
    return this.book.isOwnedBy(this.viewer)
  }

  can(permission: BookPermission): boolean {
    if (this.isOwner) return true
    if (permission === 'view' && this.book.visibility !== 'private') return true

    return !!this.code?.allows(permission)
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
