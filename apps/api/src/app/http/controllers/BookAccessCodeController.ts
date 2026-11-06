import { abortIf, assertFound } from '@arkstack/common'
import { BaseController } from './BaseController'
import { BookAccess } from '@app/policies/BookAccess'
import { BookAccessCode } from '@app/models/BookAccessCode'
import { BookAccessCodeCollection } from '@app/http/resources/BookAccessCodeCollection'
import { BookAccessCodeResource } from '@app/http/resources/BookAccessCodeResource'
import { BookAccessGrantResource } from '@app/http/resources/BookAccessGrantResource'
import { BookDetailResource } from '@app/http/resources/BookDetailResource'

const PERMISSION = `in:${BookAccessCode.PERMISSIONS.join(',')}`

/**
 * Access codes that unlock a book. Owners create and revoke them; anyone holding
 * one can open the book, and a code with `transfer` lets the holder claim it.
 */
export default class BookAccessCodeController extends BaseController {
  async index() {
    const book = await this.user.books().with({ codes: (query) => query.latest('createdAt') }).findOrFail(String(this.params.book))
    const codes = book.getAttribute('codes')

    return new BookAccessCodeCollection(codes.all()).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async create() {
    const book = await this.user.books().findOrFail(String(this.params.book))
    const data = await this.validate({
      label: 'nullable|string|max:80',
      permissions: 'nullable|array',
      'permissions.*': PERMISSION,
      expiresAt: 'nullable|date',
    })

    const code = await BookAccessCode.issue(book, data)

    return new BookAccessCodeResource(code)
      .additional({ status: 'success', message: 'Access code created', code: 201 })
      .response()
      .setStatusCode(201)
  }

  async update() {
    const code = await this.ownedCode()
    const data = await this.validate({
      label: 'nullable|string|max:80',
      permissions: 'nullable|array',
      'permissions.*': PERMISSION,
      expiresAt: 'nullable|date',
    })

    code.revise(data)
    await code.save()

    return new BookAccessCodeResource(code).additional({ status: 'success', message: 'Access code updated', code: 200 })
  }

  /** Revoke a code. Anyone using it loses access straight away. */
  async destroy() {
    const code = await this.ownedCode()

    await code.delete()

    return new BookAccessCodeResource(code).additional({ status: 'success', message: 'Access code revoked', code: 200 })
  }

  /** Find the book a typed code opens and count the visit. Works signed out. */
  async redeem() {
    const data = await this.validate({ code: 'required|string|max:32' })
    const visitor = String(this.ctx.req.ip)

    await BookAccessCode.guesses(visitor).ensureAllowed('Too many wrong access codes.')

    const code = await BookAccessCode.attempt(data.code, visitor)

    assertFound(code, 'That access code is not valid or has expired.', 404)

    const book = await code.book().firstOrFail()

    await code.recordUse()

    return new BookAccessGrantResource(new BookAccess(book, null, code)).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** Take ownership of the book a `transfer` code was made for. */
  async claim() {
    const data = await this.validate({ code: 'required|string|max:32' })
    const visitor = String(this.ctx.req.ip)

    await BookAccessCode.guesses(visitor).ensureAllowed('Too many wrong access codes.')

    const code = await BookAccessCode.attempt(data.code, visitor)

    assertFound(code, 'That access code is not valid or has expired.', 404)
    abortIf(!code.allows('transfer'), 'This access code does not let you claim the book.', 403)

    const book = await code.book().firstOrFail()

    abortIf(book.isOwnedBy(this.user), 'This book is already yours.', 422)

    await book.transferTo(this.user)

    return new BookDetailResource(book)
      .for(new BookAccess(book, this.user))
      .additional({ status: 'success', message: 'The book is now yours', code: 200 })
  }

  private async ownedCode(): Promise<BookAccessCode> {
    const book = await this.user.books().findOrFail(String(this.params.book))

    return book.codes().findOrFail(String(this.params.code))
  }
}
