import type { BookAccess } from '@app/policies/BookAccess'
import { BookResource } from './BookResource'
import { Resource } from 'resora'

/** The book an access code opens and what it lets the holder do. */
export class BookAccessGrantResource extends Resource {
  async data() {
    const access = this.resource as BookAccess

    return {
      code: access.code?.code ?? null,
      permissions: access.permissions(),
      book: await new BookResource(access.book).data(),
    }
  }
}
