import { BookPage } from './BookPage'
import { Model } from '@arkstack/database'
import { Photo } from './Photo'
import { Space } from './Space'
import { User } from './User'
import { matches } from '@app/support/search'
import type { QueryBuilder } from 'arkormx'

export type BookVisibility = 'private' | 'shared' | 'public'

/** What someone searched for and how they narrowed it. */
export interface BookFilters {
  q?: string | null
  theme?: string | null
  visibility?: string | null
  sort?: string | null
  /** Only books in this space. */
  space?: string | null
}

export interface PageInput {
  layout?: string | null
  caption?: string | null
  photoIds?: string[] | null
}

export class Book extends Model {
  declare id: string
  declare userId: string
  declare spaceId: string | null
  declare title: string
  declare description: string | null
  declare coverPhotoId: string | null
  declare visibility: BookVisibility
  declare theme: string
  declare paper: string
  declare publishedAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date

  static readonly VISIBILITIES = ['private', 'shared', 'public']
  static readonly THEMES = ['classic', 'linen', 'midnight']
  static readonly PAPERS = ['ivory', 'white', 'kraft', 'charcoal']
  static readonly MAX_PAGES = 500

  /** How many photos each page layout holds. */
  static readonly LAYOUTS: Record<string, number> = { single: 1, framed: 1, pair: 2, grid: 4, collage: 3, text: 0 }

  protected static override table = 'books'

  protected static override columns = {
    userId: 'user_id',
    spaceId: 'space_id',
    coverPhotoId: 'cover_photo_id',
    publishedAt: 'published_at',
  }

  user() {
    return this.belongsTo(User, 'userId')
  }

  pages() {
    return this.hasMany(BookPage, 'bookId')
  }

  space() {
    return this.belongsTo(Space, 'spaceId')
  }

  cover() {
    return this.belongsTo(Photo, 'coverPhotoId')
  }

  /**
   * Public books with at least one page, for Explore, or for one space's page when `filters.space` is its id.
   * Words match titles, descriptions and shown owner names.
   */
  static published(filters: BookFilters = {}) {
    const query = Book.query().where({ visibility: 'public' }).has('pages')
    const text = filters.q?.trim()

    if (text) {
      query.where((match: QueryBuilder<Book>) =>
        match
          .where(matches('title', text))
          .orWhere(matches('description', text))
          .orWhereHas('user', (owner: QueryBuilder<User>) => owner.where({ showOwnerName: true }).where(matches('name', text))),
      )
    }

    if (filters.space) query.where({ spaceId: filters.space })
    else Space.listedOnly(query)

    return Book.narrow(query, filters, 'publishedAt')
  }

  /** One person's books. Words match titles and descriptions. */
  static library(owner: User, filters: BookFilters = {}) {
    const query = Book.query().where({ userId: owner.id })
    const text = filters.q?.trim()

    if (text) query.where((match: QueryBuilder<Book>) => match.where(matches('title', text)).orWhere(matches('description', text)))
    if (filters.visibility) query.where({ visibility: filters.visibility as BookVisibility })
    if (filters.space) query.where({ spaceId: filters.space })

    return Book.narrow(query, filters, 'updatedAt')
  }

  /** Filter by cover theme and order newest or oldest first. */
  private static narrow(query: QueryBuilder<Book>, filters: BookFilters, by: 'publishedAt' | 'updatedAt') {
    if (filters.theme) query.where({ theme: filters.theme })

    return filters.sort === 'oldest' ? query.oldest(by) : query.latest(by)
  }

  /** Change who can open the book. Making it public puts it at the top of Explore. */
  setVisibility(visibility: BookVisibility): void {
    if (visibility === this.visibility) return

    this.visibility = visibility
    this.publishedAt = visibility === 'public' ? new Date() : null
  }

  /** Owners always see their books; anyone with the link sees shared and public ones. */
  isVisibleTo(viewer: User | null): boolean {
    return this.visibility !== 'private' || this.isOwnedBy(viewer)
  }

  isOwnedBy(viewer: User | null): boolean {
    return viewer?.id === this.userId
  }

  /** Pages in reading order. */
  async orderedPages(): Promise<BookPage[]> {
    return (await BookPage.query().where({ bookId: this.id }).oldest('position').get()).all()
  }

  /** Delete the book and its pages. Photos stay in the library. */
  async remove(): Promise<void> {
    await Book.transaction(async () => {
      await BookPage.query().where({ bookId: this.id }).delete()
      await this.delete()
    })
  }

  /** The chosen cover, or else the first photo in the book. */
  async coverPhoto(): Promise<Photo | null> {
    if (this.coverPhotoId) return Photo.query().find(this.coverPhotoId)

    const first = await this.pages().oldest('position').first()
    const photoId = first?.photoIds?.[0]

    return photoId ? Photo.query().find(photoId) : null
  }

  /** Keep only ids of photos the book's owner has. */
  async ownedPhotoIds(ids: string[]): Promise<string[]> {
    const unique = [...new Set(ids)]

    if (!unique.length) return []

    const photos = await Photo.query()
      .where({ userId: this.userId })
      .whereIn('id', unique as never)
      .get()

    return photos.all().map((photo) => photo.id)
  }

  /** Replace every page at once, so reordering, adding and removing pages are one save. */
  async replacePages(input: PageInput[]): Promise<void> {
    const owned = new Set(await this.ownedPhotoIds(input.flatMap((page) => page.photoIds ?? [])))

    const pages = input.map((page, index) => {
      const layout = page.layout && page.layout in Book.LAYOUTS ? page.layout : 'single'

      return {
        bookId: this.id,
        position: index + 1,
        layout,
        caption: page.caption?.trim() || null,
        photoIds: (page.photoIds ?? []).filter((id) => owned.has(id)).slice(0, Book.LAYOUTS[layout]),
      }
    })

    await Book.transaction(async () => {
      await BookPage.query().where({ bookId: this.id }).delete()

      for (const page of pages) await BookPage.query().create(page as never)

      await this.update({ updatedAt: new Date() })
    })
  }
}
