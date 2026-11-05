import { serializeBook, serializeBookWithPages } from '@app/support/serializers'

import { Auth } from '@arkstack/auth'
import { BaseController } from './BaseController'
import { Book } from '@app/models/Book'
import { BookPage } from '@app/models/BookPage'
import { Photo } from '@app/models/Photo'
import { User } from '@app/models/User'

const VISIBILITIES = ['private', 'shared', 'public']
const THEMES = ['classic', 'linen', 'midnight']
const LAYOUTS: Record<string, number> = { single: 1, framed: 1, pair: 2, grid: 4 }
const MAX_PAGES = 500

/**
 * Photo books and their pages.
 */
export default class BookController extends BaseController {
  async index() {
    const { page, perPage } = this.pagination(30, 100)
    const where = { userId: this.user.id }

    const total = await Book.query().where(where).count()
    const books = (
      await Book.query()
        .where(where)
        .latest('updatedAt')
        .skip((page - 1) * perPage)
        .take(perPage)
        .get()
    ).all()

    const coverIds = books.map((b) => b.coverPhotoId).filter((id): id is string => !!id)
    const covers = coverIds.length ? (await Photo.query().whereIn('id', coverIds as never).get()).all() : []

    const data = await Promise.all(
      books.map(async (book) => {
        const pageCount = await BookPage.query().where({ bookId: book.id }).count()
        let cover = covers.find((p) => p.id === book.coverPhotoId) ?? null

        // Without a chosen cover, use the first photo in the book.
        if (!cover && pageCount > 0) {
          const first = await BookPage.query().where({ bookId: book.id }).oldest('position').first()
          const firstId = first?.photoIds?.[0]
          cover = firstId ? await Photo.query().find(firstId) : null
        }

        return serializeBook(book, { pageCount, coverPhoto: cover })
      }),
    )

    return this.respondPaginated(data, total, page, perPage)
  }

  async store() {
    const data = await this.validate({
      title: 'required|string|max:160',
      description: 'nullable|string|max:2000',
      visibility: 'nullable|string',
      theme: 'nullable|string',
    })

    const book = await Book.query().create({
      userId: this.user.id,
      title: String(data.title).trim(),
      description: data.description ? String(data.description) : null,
      visibility: VISIBILITIES.includes(data.visibility) ? data.visibility : 'private',
      theme: THEMES.includes(data.theme) ? data.theme : 'classic',
    })

    return this.respond(await serializeBook(book, { pageCount: 0 }), 'Book created', 201)
  }

  /**
   * Open a book with every page. Owners can always open their books; anyone
   * with the link can open a shared or public book.
   */
  async show() {
    const book = await Book.query()
      .where({ id: String(this.params.id) })
      .first()
      .catch(() => null)
    if (!book) return this.notFound('Book')

    const viewer = await this.optionalUser()
    const canEdit = viewer?.id === book.userId

    if (!canEdit && book.visibility === 'private') return this.notFound('Book')

    return this.respond(await this.loadFull(book, canEdit))
  }

  async update() {
    const book = await this.findOwned()
    const data = await this.validate({
      title: 'nullable|string|max:160',
      description: 'nullable|string|max:2000',
      visibility: 'nullable|string',
      theme: 'nullable|string',
      coverPhotoId: 'nullable|string',
    })

    const changes: Record<string, unknown> = {}
    if (data.title) changes.title = String(data.title).trim()
    if ('description' in this.body) changes.description = data.description || null
    if (VISIBILITIES.includes(data.visibility)) changes.visibility = data.visibility
    if (THEMES.includes(data.theme)) changes.theme = data.theme
    if ('coverPhotoId' in this.body) {
      changes.coverPhotoId = data.coverPhotoId ? (await this.ownedPhotoIds([data.coverPhotoId]))[0] ?? null : null
    }

    if (Object.keys(changes).length) {
      changes.updatedAt = new Date()
      await Book.query().where({ id: book.id }).update(changes)
    }

    return this.respond(await this.loadFull((await Book.query().find(book.id)) as Book, true), 'Book updated')
  }

  async destroy() {
    const book = await this.findOwned()

    await BookPage.query().where({ bookId: book.id }).delete()
    await Book.query().where({ id: book.id }).delete()

    return this.respond(null, 'Book deleted')
  }

  /**
   * Replace every page of a book at once. The editor always sends the whole
   * book, so reordering, adding and removing pages are one request.
   */
  async savePages() {
    const book = await this.findOwned()
    const input = Array.isArray(this.body.pages) ? (this.body.pages as any[]) : null

    if (!input) return this.invalid('pages', 'Send the book pages as a list')
    if (input.length > MAX_PAGES) return this.invalid('pages', `A book can have up to ${MAX_PAGES} pages`)

    const requested = input.flatMap((p) => (Array.isArray(p?.photoIds) ? p.photoIds.map(String) : []))
    const owned = new Set(await this.ownedPhotoIds(requested))

    const pages = input.map((p, index) => {
      const layout = typeof p?.layout === 'string' && p.layout in LAYOUTS ? p.layout : 'single'
      const photoIds = (Array.isArray(p?.photoIds) ? p.photoIds.map(String) : [])
        .filter((id: string) => owned.has(id))
        .slice(0, LAYOUTS[layout])

      return {
        bookId: book.id,
        position: index + 1,
        layout,
        caption: typeof p?.caption === 'string' && p.caption.trim() ? p.caption.slice(0, 500) : null,
        photoIds,
      }
    })

    await Book.transaction(async () => {
      await BookPage.query().where({ bookId: book.id }).delete()
      for (const page of pages) await BookPage.query().create(page as never)
      await Book.query().where({ id: book.id }).update({ updatedAt: new Date() })
    })

    return this.respond(await this.loadFull(book, true), 'Book saved')
  }

  private async loadFull(book: Book, canEdit: boolean) {
    const pages = (await BookPage.query().where({ bookId: book.id }).oldest('position').get()).all()
    const ids = [...new Set([...pages.flatMap((p) => p.photoIds ?? []), ...(book.coverPhotoId ? [book.coverPhotoId] : [])])]
    const photos = ids.length ? (await Photo.query().whereIn('id', ids as never).get()).all() : []
    const owner = await User.query().find(book.userId)

    return serializeBookWithPages(book, pages, photos, owner, canEdit)
  }

  private async ownedPhotoIds(ids: string[]): Promise<string[]> {
    const unique = [...new Set(ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)))]
    if (!unique.length) return []

    const photos = (await Photo.query().where({ userId: this.user.id }).whereIn('id', unique as never).get()).all()

    return photos.map((p) => p.id)
  }

  private async findOwned(): Promise<Book> {
    const book = await Book.query()
      .where({ id: String(this.params.id), userId: this.user.id })
      .first()
      .catch(() => null)

    return book ?? this.notFound('Book')
  }

  private async optionalUser(): Promise<User | null> {
    const header = this.ctx.req.headers.authorization
    if (!header?.startsWith('Bearer ')) return null

    try {
      return (await Auth.make()
        .setRequest(this.ctx.req as never)
        .authorizeToken(header.slice(7))) as unknown as User
    } catch {
      return null
    }
  }

  private invalid(field: string, message: string) {
    this.ctx.res.status(422).json({ status: 'error', message, code: 422, errors: { [field]: [message] } })
  }
}
