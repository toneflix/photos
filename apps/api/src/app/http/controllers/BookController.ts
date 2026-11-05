import { abortIf, perPage } from '@arkstack/common'
import { BaseController } from './BaseController'
import { Book } from '@app/models/Book'
import { BookCollection } from '@app/http/resources/BookCollection'
import { BookDetailResource } from '@app/http/resources/BookDetailResource'
import { SORTS } from '@app/support/search'
import { UUID } from '@app/support/rules'

const VISIBILITY = `in:${Book.VISIBILITIES.join(',')}`
const THEME = `in:${Book.THEMES.join(',')}`
const PAPER = `in:${Book.PAPERS.join(',')}`

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
      space: ['nullable', UUID],
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
      spaceId: ['nullable', UUID],
    })

    const space = data.spaceId ? await this.user.spaces().findOrFail(data.spaceId) : null
    const visibility = data.visibility || this.user.defaultVisibility || 'private'
    const book = await Book.query().create({
      userId: this.user.id,
      spaceId: space?.id ?? null,
      title: String(data.title).trim(),
      description: data.description || null,
      visibility,
      publishedAt: visibility === 'public' ? new Date() : null,
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
      spaceId: ['nullable', UUID],
    })

    if (data.title) book.title = String(data.title).trim()
    if ('description' in data) book.description = data.description || null
    if (data.visibility) book.setVisibility(data.visibility)
    if (data.theme) book.theme = data.theme
    if (data.paper) book.paper = data.paper
    if ('spaceId' in data) book.spaceId = data.spaceId ? (await this.user.spaces().findOrFail(data.spaceId)).id : null
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
}
