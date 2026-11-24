import { COVER_DESIGNS, COVER_THEMES, FRAME_STYLES, PAGE_LAYOUTS, PAPER_COLORS, PhotoCrop } from '@toneflix/flipbook-core'
import { BookAccessCode } from './BookAccessCode'
import { BookPage } from './BookPage'
import { Model } from '@arkstack/database'
import { Photo } from './Photo'
import { Space } from './Space'
import { User } from './User'
import { matches } from '@app/support/search'
import { PrintCache } from '@app/services/PrintCache'
import type { PageLayout, PhotoPosition } from '@toneflix/flipbook-core'
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
  frame?: string | null
  caption?: string | null
  photoIds?: string[] | null
  photoFrames?: (string | null)[] | null
  photoPositions?: unknown[] | null
}

export class Book extends Model {
  declare id: string
  declare userId: string
  /** Who made the book. It keeps their branding and copyright after a client claims it. */
  declare creatorId: string | null
  declare spaceId: string | null
  declare title: string
  declare description: string | null
  declare coverPhotoId: string | null
  declare visibility: BookVisibility
  declare theme: string
  declare coverDesign: string
  /** Null leaves it to the cover design: on, except for full-image covers. */
  declare coverText: boolean | null
  /** Which part of the cover photo shows, or null when it is centred. */
  declare coverPosition: PhotoPosition | null
  declare paper: string
  declare frame: string
  /** The owner's own line above the cover title, in place of the Toneflix one. */
  declare kicker: string | null
  /** The owner's brand, printed on the back cover above the imprint. */
  declare brand: string | null
  /** The owner's own name on the back cover, in place of Toneflix Photos. */
  declare imprint: string | null
  /** Whether visitors may download the book as a zip. */
  declare allowDownloads: boolean
  declare publishedAt: Date | null
  declare viewCount: number
  declare downloadCount: number
  declare createdAt: Date
  declare updatedAt: Date

  static readonly VISIBILITIES = ['private', 'shared', 'public']
  static readonly THEMES = Object.keys(COVER_THEMES)
  static readonly COVER_DESIGNS = Object.keys(COVER_DESIGNS)
  static readonly PAPERS = Object.keys(PAPER_COLORS)
  static readonly FRAMES = Object.keys(FRAME_STYLES)
  static readonly LAYOUTS = Object.keys(PAGE_LAYOUTS)

  protected static override table = 'books'

  protected static override columns = {
    userId: 'user_id',
    creatorId: 'creator_id',
    spaceId: 'space_id',
    coverPhotoId: 'cover_photo_id',
    coverDesign: 'cover_design',
    coverText: 'cover_text',
    coverPosition: 'cover_position',
    allowDownloads: 'allow_downloads',
    publishedAt: 'published_at',
    viewCount: 'view_count',
    downloadCount: 'download_count',
  }

  protected override casts = {
    coverPosition: 'json',
  } as never

  /** A photo position to store: clamped and rounded, or null when the photo is centred. */
  static photoPosition(input: unknown): PhotoPosition | null {
    const crop = input && typeof input === 'object' ? PhotoCrop.of(input as Partial<PhotoPosition>) : PhotoCrop.CENTRE

    return crop.isCentred ? null : crop.toJSON()
  }

  user() {
    return this.belongsTo(User, 'userId')
  }

  creator() {
    return this.belongsTo(User, 'creatorId')
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

  codes() {
    return this.hasMany(BookAccessCode, 'bookId')
  }

  /**
   * Public books with at least one page, for Explore, or for one space's page when `filters.space` is its id.
   * Words match titles, descriptions and shown owner names.
   */
  scopePublished(query: QueryBuilder<Book>, filters: BookFilters = {}): QueryBuilder<Book> {
    const text = filters.q?.trim()

    query.scope('public')

    if (text) {
      query.where((match: QueryBuilder<Book>) =>
        match
          .where(matches('title', text))
          .orWhere(matches('description', text))
          .orWhereHas('user', (owner: QueryBuilder<User>) => owner.where({ showOwnerName: true }).where(matches('name', text))),
      )
    }

    if (filters.space) query.where({ spaceId: filters.space })
    else query.scope('listed')

    return query.scope('narrowed', filters, 'publishedAt')
  }

  /** Library books, used on an owner's `books()`. Words match titles and descriptions. */
  scopeLibrary(query: QueryBuilder<Book>, filters: BookFilters = {}): QueryBuilder<Book> {
    const text = filters.q?.trim()

    if (text) query.where((match: QueryBuilder<Book>) => match.where(matches('title', text)).orWhere(matches('description', text)))
    if (filters.visibility) query.where({ visibility: filters.visibility as BookVisibility })
    if (filters.space) query.where({ spaceId: filters.space })

    return query.scope('narrowed', filters, 'updatedAt')
  }

  /** Filter by cover theme and order newest or oldest first. */
  scopeNarrowed(query: QueryBuilder<Book>, filters: BookFilters, by: 'publishedAt' | 'updatedAt'): QueryBuilder<Book> {
    if (filters.theme) query.where({ theme: filters.theme })

    return filters.sort === 'oldest' ? query.oldest(by) : query.latest(by)
  }

  /** Public books with at least one page. */
  scopePublic(query: QueryBuilder<Book>): QueryBuilder<Book> {
    return query.where({ visibility: 'public' }).has('pages')
  }

  /** Public books with pages, and every book of the user `ownerId` when given. */
  scopeShownTo(query: QueryBuilder<Book>, ownerId: string | null = null): QueryBuilder<Book> {
    if (!ownerId) return query.scope('public')

    return query.where((shown: QueryBuilder<Book>) => shown.where((open: QueryBuilder<Book>) => open.scope('public')).orWhere({ userId: ownerId }))
  }

  /** Leave out books that sit in private spaces. */
  scopeListed(query: QueryBuilder<Book>): QueryBuilder<Book> {
    return query.whereDoesntHave('space', (space: QueryBuilder<Space>) => space.where({ visibility: 'private' }))
  }

  /** Change who can open the book. Making it public puts it at the top of Explore. */
  setVisibility(visibility: BookVisibility): void {
    if (visibility === this.visibility) return

    this.visibility = visibility
    this.publishedAt = visibility === 'public' ? new Date() : null
  }

  isOwnedBy(viewer: User | null): boolean {
    return viewer?.id === this.userId
  }

  /** Whether `viewer` made the book. Only the maker sets its branding. */
  isMadeBy(viewer: User | null): boolean {
    return !!viewer && viewer.id === (this.creatorId ?? this.userId)
  }

  /** Whose plan decides the book's branding: its maker, or its owner when the maker's account is gone. */
  async brandedBy(): Promise<User | null> {
    return (this.creatorId && (await this.creator().first())) || this.user().first()
  }

  /** Pages in reading order. */
  async orderedPages(): Promise<BookPage[]> {
    return (await this.pages().oldest('position').getResults()).all()
  }

  /** Every photo in the book in reading order, then the cover photo if no page shows it. */
  async orderedPhotos(pages?: BookPage[]): Promise<Photo[]> {
    pages ??= await this.orderedPages()

    const ids = [...new Set([...pages.flatMap((page) => page.photoIds ?? []), ...(this.coverPhotoId ? [this.coverPhotoId] : [])])]
    const photos = ids.length ? (await Photo.query().whereIn('id', ids as never).get()).all() : []

    return photos.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
  }

  /** Delete the book, its pages and any drawn copies of them. Photos stay in the library. */
  async remove(): Promise<void> {
    await Book.transaction(async () => {
      await (await this.pages().getQuery()).delete()
      await this.delete()
    })
    await PrintCache.forget(this.id)
  }

  /** The chosen cover, or else the first photo in the book. */
  async coverPhoto(): Promise<Photo | null> {
    if (this.coverPhotoId) return this.cover().first()

    const first = await this.pages().oldest('position').first()
    const photoId = first?.photoIds?.[0]

    return photoId ? Photo.query().find(photoId) : null
  }

  /** Put a photo on a new page at the end of the book. */
  async appendPhoto(photo: Photo, caption?: string | null): Promise<BookPage> {
    const last = await this.pages().latest('position').first()
    const page = await this.pages().create({
      position: (last?.position ?? 0) + 1,
      layout: 'single',
      caption: caption?.trim() || null,
      photoIds: [photo.id],
    })

    await this.update({ updatedAt: new Date() })

    return page
  }

  /**
   * Hand the book to a new owner. They get their own copies of its photos, so the
   * previous owner's library stays as it was. It leaves the previous owner's space and every access code stops working.
   */
  async transferTo(owner: User): Promise<void> {
    const pages = await this.orderedPages()
    const photos = await this.orderedPhotos(pages)
    const copies = new Map<string, string>()

    for (const photo of photos) copies.set(photo.id, (await photo.copyTo(owner)).id)

    await Book.transaction(async () => {
      for (const page of pages) await page.update(BookPage.place(page.placements().flatMap((placed) => (copies.has(placed.id) ? [{ ...placed, id: copies.get(placed.id)! }] : []))))

      await (await this.codes().getQuery()).delete()
      await this.update({ userId: owner.id, spaceId: null, coverPhotoId: this.coverPhotoId ? (copies.get(this.coverPhotoId) ?? null) : null })
    })
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
      const layout = (page.layout && Book.LAYOUTS.includes(page.layout) ? page.layout : 'single') as PageLayout
      const placed = (page.photoIds ?? [])
        .map((id, slot) => ({
          id,
          frame: Book.FRAMES.find((frame) => frame === page.photoFrames?.[slot]) ?? null,
          position: Book.photoPosition(page.photoPositions?.[slot]),
        }))
        .filter(({ id }) => owned.has(id))
        .slice(0, PAGE_LAYOUTS[layout].slots)

      return {
        position: index + 1,
        layout,
        frame: page.frame && Book.FRAMES.includes(page.frame) ? page.frame : null,
        caption: page.caption?.trim() || null,
        ...BookPage.place(placed),
      }
    })

    await Book.transaction(async () => {
      await (await this.pages().getQuery()).delete()

      for (const page of pages) await this.pages().create(page)

      await this.update({ updatedAt: new Date() })
    })
  }
}
