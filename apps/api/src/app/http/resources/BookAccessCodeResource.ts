import type { BookAccessCode } from '@app/models/BookAccessCode'
import { Resource } from 'resora'

/** An access code as its book's owner manages it. */
export class BookAccessCodeResource extends Resource {
  data() {
    const code = this.resource as BookAccessCode

    return {
      id: code.id,
      bookId: code.bookId,
      code: code.code,
      label: code.label,
      permissions: code.permissions,
      uses: Number(code.uses ?? 0),
      lastUsedAt: code.lastUsedAt,
      expiresAt: code.expiresAt,
      expired: code.isExpired(),
      shareUrl: `${config('app.frontend_url')}/books/${code.bookId}/view?code=${encodeURIComponent(code.code)}`,
      createdAt: code.createdAt,
      updatedAt: code.updatedAt,
    }
  }
}
