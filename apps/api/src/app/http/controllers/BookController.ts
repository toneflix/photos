import { abortIf, perPage } from '@arkstack/common'
import { Auth } from '@arkstack/auth'
import { BaseController } from './BaseController'
import { Book } from '@app/models/Book'
import { BookAccess } from '@app/policies/BookAccess'
import { BookCollection } from '@app/http/resources/BookCollection'
import { BookDetailResource } from '@app/http/resources/BookDetailResource'
import { Photo } from '@app/models/Photo'
import { regex } from 'kanun'
import { SORTS } from '@app/support/search'
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
    const filters = await this.validateQuery({
      q: 'nullable|string|max:100',
      theme: `nullable|${THEME}`,
      visibility: `nullable|${VISIBILITY}`,
      sort: `nullable|in:${SORTS.join(',')}`,
    })

    const books = await Book.library(this.user, filters).paginate(perPage(this.query, { perPage: 30, maxPerPage: 100 }))

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

    const visibility = data.visibility || this.user.defaultVisibility || 'private'
    const book = await Book.query().create({
      userId: this.user.id,
      title: String(data.title).trim(),
      description: data.description || null,
      visibility,
      publishedAt: visibility === 'public' ? new Date() : null,
      theme: data.theme || 'classic',
      paper: data.paper || 'ivory',
    })

    return new BookDetailResource(book)
      .for(new BookAccess(book, this.user))
      .additional({ status: 'success', message: 'Book created', code: 201 })
      .response()
      .setStatusCode(201)
  }

  /** Open a book with every page. Works signed out for shared and public books, and for private ones with an access code. */
  async show() {
    const access = (await this.access()).authorize('view')

    return new BookDetailResource(access.book).for(access).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** Change a book's details. Access codes with `edit` may change everything but who can open it. */
  async update() {
    const access = (await this.access()).authorize('edit')
    const book = access.book
    const data = await this.validate({
      title: 'nullable|string|max:160',
      description: 'nullable|string|max:2000',
      visibility: `nullable|${VISIBILITY}`,
      theme: `nullable|${THEME}`,
      paper: `nullable|${PAPER}`,
      coverPhotoId: ['nullable', UUID],
    })

    abortIf(!!data.visibility && !access.isOwner, 'Only the owner can change who can open this book.', 403)

    if (data.title) book.title = String(data.title).trim()
    if ('description' in data) book.description = data.description || null
    if (data.visibility) book.setVisibility(data.visibility)
    if (data.theme) book.theme = data.theme
    if (data.paper) book.paper = data.paper
    if ('coverPhotoId' in data) {
      book.coverPhotoId = data.coverPhotoId ? ((await book.ownedPhotoIds([data.coverPhotoId]))[0] ?? null) : null
    }

    await book.save()

    return new BookDetailResource(book).for(access).additional({ status: 'success', message: 'Book updated', code: 200 })
  }

  async destroy() {
    const book = await this.user.books().findOrFail(String(this.params.book))

    await book.remove()

    return new BookDetailResource(book)
      .for(new BookAccess(book, this.user))
      .additional({ status: 'success', message: 'Book deleted', code: 200 })
  }

  /** Replace every page of a book at once. The editor always sends the whole book. */
  async savePages() {
    const access = (await this.access()).authorize('edit')
    const book = access.book
    const data = await this.validate({
      pages: `present|array|max:${Book.MAX_PAGES}`,
      'pages.*.layout': `nullable|in:${Object.keys(Book.LAYOUTS).join(',')}`,
      'pages.*.caption': 'nullable|string|max:500',
      'pages.*.photoIds': 'nullable|array',
      'pages.*.photoIds.*': [UUID],
    })

    await book.replacePages(data.pages)

    return new BookDetailResource(book).for(access).additional({ status: 'success', message: 'Book saved', code: 200 })
  }

  /** Upload a photo onto a new last page. It joins the book owner's library, even when a code holder adds it. */
  async addPhoto() {
    const access = (await this.access()).authorize('add')
    const book = access.book
    const data = await this.validate({
      photo: `required|file|mimetypes:${Object.keys(Photo.EXTENSIONS).join(',')}|max:25600`,
      width: 'nullable|integer|min:1',
      height: 'nullable|integer|min:1',
      caption: 'nullable|string|max:500',
    })

    const owner = await book.user().firstOrFail()
    const photo = await Photo.upload(owner, data.photo, {
      width: data.width ? Number(data.width) : null,
      height: data.height ? Number(data.height) : null,
    })

    await book.appendPhoto(photo, data.caption)

    return new BookDetailResource(book)
      .for(access)
      .additional({ status: 'success', message: 'Photo added', code: 201 })
      .response()
      .setStatusCode(201)
  }

  /** The book in the route and what this visitor may do with it, from their sign-in and any access code they sent. */
  private async access(): Promise<BookAccess> {
    const book = await Book.query().findOrFail(String(this.params.book))
    const code = this.ctx.req.headers['x-access-code'] ?? this.query.code

    return BookAccess.resolve(book, await this.viewer(), typeof code === 'string' ? code : null)
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
