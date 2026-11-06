import { abortIf, perPage } from '@arkstack/common'
import { BaseController } from './BaseController'
import { Book } from '@app/models/Book'
import { BookAccess } from '@app/policies/BookAccess'
import { BookArchive } from '@app/services/BookArchive'
import { BookCollection } from '@app/http/resources/BookCollection'
import { BookDetailResource } from '@app/http/resources/BookDetailResource'
import { Photo } from '@app/models/Photo'
import { SORTS } from '@app/support/search'
import { UUID, photoFile, photoPosition } from '@app/support/rules'
import { Settings } from '@app/support/Settings'

const VISIBILITY = `in:${Book.VISIBILITIES.join(',')}`
const THEME = `in:${Book.THEMES.join(',')}`
const PAPER = `in:${Book.PAPERS.join(',')}`
const FRAME = `in:${Book.FRAMES.join(',')}`
const COVER_DESIGN = `in:${Book.COVER_DESIGNS.join(',')}`

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
      coverDesign: `nullable|${COVER_DESIGN}`,
      coverText: 'nullable|boolean',
      paper: `nullable|${PAPER}`,
      frame: `nullable|${FRAME}`,
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
      coverDesign: data.coverDesign || 'classic',
      coverText: data.coverText ?? null,
      paper: data.paper || 'ivory',
      frame: data.frame || 'none',
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
      coverDesign: `nullable|${COVER_DESIGN}`,
      coverText: 'nullable|boolean',
      paper: `nullable|${PAPER}`,
      frame: `nullable|${FRAME}`,
      coverPhotoId: ['nullable', UUID],
      ...photoPosition('coverPosition'),
      spaceId: ['nullable', UUID],
    })

    abortIf((!!data.visibility || 'spaceId' in data) && !access.isOwner, 'Only the owner can change who can open this book or its space.', 403)

    if (data.title) book.title = String(data.title).trim()
    if ('description' in data) book.description = data.description || null
    if (data.visibility) book.setVisibility(data.visibility)
    if (data.theme) book.theme = data.theme
    if (data.coverDesign) book.coverDesign = data.coverDesign
    if ('coverText' in data) book.coverText = data.coverText ?? null
    if (data.paper) book.paper = data.paper
    if (data.frame) book.frame = data.frame
    if ('spaceId' in data) book.spaceId = data.spaceId ? (await access.viewer!.spaces().findOrFail(data.spaceId)).id : null
    if ('coverPhotoId' in data) {
      const coverPhotoId = data.coverPhotoId ? ((await book.ownedPhotoIds([data.coverPhotoId]))[0] ?? null) : null

      if (coverPhotoId !== book.coverPhotoId) book.coverPosition = null
      book.coverPhotoId = coverPhotoId
    }
    if ('coverPosition' in data) book.coverPosition = Book.photoPosition(data.coverPosition)

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
      pages: `present|array|max:${await Settings.number('books.max_pages')}`,
      'pages.*.layout': `nullable|in:${Book.LAYOUTS.join(',')}`,
      'pages.*.frame': `nullable|${FRAME}`,
      'pages.*.caption': 'nullable|string|max:500',
      'pages.*.photoIds': 'nullable|array',
      'pages.*.photoIds.*': [UUID],
      'pages.*.photoFrames': 'nullable|array',
      'pages.*.photoFrames.*': `nullable|${FRAME}`,
      'pages.*.photoPositions': 'nullable|array',
      ...photoPosition('pages.*.photoPositions.*'),
    })

    await book.replacePages(data.pages)

    return new BookDetailResource(book).for(access).additional({ status: 'success', message: 'Book saved', code: 200 })
  }

  /** Upload a photo onto a new last page. It joins the book owner's library, even when a code holder adds it. */
  async addPhoto() {
    const access = (await this.access()).authorize('add')
    const book = access.book
    const data = await this.validate({
      photo: photoFile((await Settings.number('uploads.max_photo_mb')) * 1024),
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

  /** The book's original photos as a zip, limited to the ones this visitor may download. */
  async download() {
    const access = (await this.access()).authorize('view')
    const archive = await BookArchive.for(access)

    abortIf(!archive.total, 'This book has no photos yet.', 404)
    abortIf(archive.isEmpty, 'The photographer keeps all rights to the photos in this book, so they cannot be downloaded.', 403)

    return archive.response()
  }

  /** The book in the route and what this visitor may do with it, from their sign-in and any access code they sent. */
  private async access(): Promise<BookAccess> {
    const book = await Book.query().findOrFail(String(this.params.book))
    const code = this.ctx.req.headers['x-access-code'] ?? this.query.code

    return BookAccess.resolve(book, await this.viewer(), String(this.ctx.req.ip), typeof code === 'string' ? code : null)
  }
}
