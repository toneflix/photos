import { abortIf, perPage } from '@arkstack/common'
import { Auth } from '@arkstack/auth'
import { BaseController } from './BaseController'
import { Book } from '@app/models/Book'
import { BookCollection } from '@app/http/resources/BookCollection'
import { BookDetailResource } from '@app/http/resources/BookDetailResource'
import { regex } from 'kanun'
import type { User } from '@app/models/User'

const VISIBILITY = `in:${Book.VISIBILITIES.join(',')}`
const THEME = `in:${Book.THEMES.join(',')}`
const PAPER = `in:${Book.PAPERS.join(',')}`
const UUID = regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

/**
 * Photo books and their pages.
 */
export default class BookController extends BaseController {
  async index() {
    const books = await this.user.books().latest('updatedAt').paginate(perPage(this.query, { perPage: 30, maxPerPage: 100 }))

    return new BookCollection(books).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async create() {
    const data = await this.validate({
      title: 'required|string|max:160',
      description: 'nullable|string|max:2000',
      visibility: `nullable|${VISIBILITY}`,
      theme: `nullable|${THEME}`,
      paper: `nullable|${PAPER}`,
    })

    const book = await Book.query().create({
      userId: this.user.id,
      title: String(data.title).trim(),
      description: data.description || null,
      visibility: data.visibility || this.user.defaultVisibility || 'private',
      theme: data.theme || 'classic',
      paper: data.paper || 'ivory',
    })

    return new BookDetailResource(book)
      .for(this.user)
      .additional({ status: 'success', message: 'Book created', code: 201 })
      .response()
      .setStatusCode(201)
  }

  /** Open a book with every page. Works signed out for shared and public books. */
  async show() {
    const book = await Book.query().findOrFail(String(this.params.book))
    const viewer = await this.viewer()

    abortIf(!book.isVisibleTo(viewer), 'Book not found!', 404)

    return new BookDetailResource(book).for(viewer).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async update() {
    const book = await this.user.books().findOrFail(String(this.params.book))
    const data = await this.validate({
      title: 'nullable|string|max:160',
      description: 'nullable|string|max:2000',
      visibility: `nullable|${VISIBILITY}`,
      theme: `nullable|${THEME}`,
      paper: `nullable|${PAPER}`,
      coverPhotoId: ['nullable', UUID],
    })

    if (data.title) book.title = String(data.title).trim()
    if ('description' in data) book.description = data.description || null
    if (data.visibility) book.visibility = data.visibility
    if (data.theme) book.theme = data.theme
    if (data.paper) book.paper = data.paper
    if ('coverPhotoId' in data) {
      book.coverPhotoId = data.coverPhotoId ? ((await book.ownedPhotoIds([data.coverPhotoId]))[0] ?? null) : null
    }

    await book.save()

    return new BookDetailResource(book).for(this.user).additional({ status: 'success', message: 'Book updated', code: 200 })
  }

  async destroy() {
    const book = await this.user.books().findOrFail(String(this.params.book))

    await book.remove()

    return new BookDetailResource(book).for(this.user).additional({ status: 'success', message: 'Book deleted', code: 200 })
  }

  /** Replace every page of a book at once. The editor always sends the whole book. */
  async savePages() {
    const book = await this.user.books().findOrFail(String(this.params.book))
    const data = await this.validate({
      pages: `present|array|max:${Book.MAX_PAGES}`,
      'pages.*.layout': `nullable|in:${Object.keys(Book.LAYOUTS).join(',')}`,
      'pages.*.caption': 'nullable|string|max:500',
      'pages.*.photoIds': 'nullable|array',
      'pages.*.photoIds.*': [UUID],
    })

    await book.replacePages(data.pages)

    return new BookDetailResource(book).for(this.user).additional({ status: 'success', message: 'Book saved', code: 200 })
  }

  /** The signed-in viewer on a route without the `auth` middleware, if any. */
  private async viewer(): Promise<User | null> {
    const header = this.ctx.req.headers.authorization

    if (!header?.startsWith('Bearer ')) return null

    return (await Auth.make()
      .setRequest(this.ctx.req as never)
      .authorizeToken(header.slice(7))
      .catch(() => null)) as User | null
  }
}
