import { Book } from './Book'
import { ImageFile } from '@app/support/ImageFile'
import { PhotoImage } from '@app/support/PhotoImage'
import { BookPage } from './BookPage'
import { Model } from '@arkstack/database'
import { Space } from './Space'
import { Storage } from '@arkstack/filesystem'
import { User } from './User'
import { matches } from '@app/support/search'
import type { QueryBuilder } from 'arkormx'
import { randomUUID } from 'node:crypto'

export type PhotoVisibility = 'private' | 'public'

/** How others may use a public photo. Only open licences can be downloaded. */
export type PhotoLicense = 'all-rights-reserved' | 'cc-by' | 'cc-by-nc' | 'cc0'

/** What someone searched for and how they narrowed it. */
export interface PhotoFilters {
  q?: string | null
  orientation?: string | null
  visibility?: string | null
  sort?: string | null
  /** Only photos in this space. */
  space?: string | null
}

export interface UploadedPhoto {
  buffer: Buffer
  mimetype: string
  originalname?: string
  size: number
}

export interface PhotoDetails {
  width?: number | null
  height?: number | null
  caption?: string | null
  takenAt?: string | null
  spaceId?: string | null
  license?: PhotoLicense | null
}

export class Photo extends Model {
  declare id: string
  declare userId: string
  declare spaceId: string | null
  declare disk: string
  declare path: string
  declare originalName: string | null
  declare mimeType: string
  declare size: number
  declare width: number | null
  declare height: number | null
  declare caption: string | null
  declare takenAt: Date | null
  declare visibility: PhotoVisibility
  declare publishedAt: Date | null
  declare license: PhotoLicense
  declare createdAt: Date
  declare updatedAt: Date

  static readonly VISIBILITIES = ['private', 'public']
  static readonly ORIENTATIONS = ['landscape', 'portrait', 'square']
  static readonly LICENSES = ['all-rights-reserved', 'cc-by', 'cc-by-nc', 'cc0']

  /** The largest photo upload, in kilobytes. */
  static readonly MAX_KILOBYTES = 25_600

  /** File extension for each accepted image type. */
  static readonly EXTENSIONS: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
    'image/heic': 'heic',
    'image/heif': 'heif',
  }

  protected static override table = 'photos'

  protected static override columns = {
    userId: 'user_id',
    spaceId: 'space_id',
    originalName: 'original_name',
    mimeType: 'mime_type',
    takenAt: 'taken_at',
    publishedAt: 'published_at',
  }

  protected override casts = {
    size: 'number',
    width: 'number',
    height: 'number',
  } as never

  /** PHOTOS_DISK, or the `public` disk while the default disk is local. */
  static disk(): string {
    const fallback = String(env('FILESYSTEM_DISK', 'local'))

    return String(env('PHOTOS_DISK', '') || (fallback === 'local' ? 'public' : fallback))
  }

  /** The largest original kept, in bytes. Bigger uploads are compressed to fit before they are stored. */
  static maxOriginalBytes(): number {
    return Math.round(Number(config('photos.max_original_mb')) * 1024 * 1024)
  }

  /**
   * Store an upload under the owner's folder and record its path. Type and size come from the file's bytes when readable.
   * Originals over the size cap are compressed first; formats that can't be re-encoded are kept as uploaded.
   */
  static async upload(owner: User, file: UploadedPhoto, details: PhotoDetails = {}): Promise<Photo> {
    const image = ImageFile.read(file.buffer)
    const mimeType = image?.mimeType ?? file.mimetype
    const original = await new PhotoImage(file.buffer, mimeType).fitWithin(Photo.maxOriginalBytes()).catch(() => null)
    const bytes = original?.bytes ?? file.buffer
    const disk = Photo.disk()
    const path = `photos/${owner.id}/${randomUUID()}.${Photo.EXTENSIONS[mimeType] ?? 'bin'}`

    await Storage.disk(disk as never).put(path, new Uint8Array(bytes))

    return Photo.query().create({
      userId: owner.id,
      spaceId: details.spaceId ?? null,
      disk,
      path,
      originalName: file.originalname?.slice(0, 255) || null,
      mimeType,
      size: bytes.length,
      width: original?.width ?? image?.width ?? details.width ?? null,
      height: original?.height ?? image?.height ?? details.height ?? null,
      caption: details.caption ?? null,
      takenAt: details.takenAt ? new Date(details.takenAt) : null,
      license: details.license || owner.defaultLicense || 'all-rights-reserved',
    })
  }

  /** A private copy of this photo, file included, in another person's library. */
  async copyTo(owner: User): Promise<Photo> {
    const path = `photos/${owner.id}/${randomUUID()}.${Photo.EXTENSIONS[this.mimeType] ?? 'bin'}`

    await Storage.disk(this.disk as never).copy(this.path, path)

    return Photo.query().create({
      userId: owner.id,
      disk: this.disk,
      path,
      originalName: this.originalName,
      mimeType: this.mimeType,
      size: this.size,
      width: this.width,
      height: this.height,
      caption: this.caption,
      takenAt: this.takenAt,
      spaceId: null,
    })
  }

  /**
   * Public photos for Explore, or for one space's page when `filters.space` is its id.
   * Words match captions and the names of owners who show their name.
   */
  static published(filters: PhotoFilters = {}) {
    const query = Photo.query().where({ visibility: 'public' })
    const text = filters.q?.trim()

    if (text) {
      query.where((match: QueryBuilder<Photo>) =>
        match
          .where(matches('caption', text))
          .orWhereHas('user', (owner: QueryBuilder<User>) => owner.where({ showOwnerName: true }).where(matches('name', text))),
      )
    }

    if (filters.space) query.where({ spaceId: filters.space })
    else Space.listedOnly(query)

    return Photo.narrow(query, filters, 'publishedAt')
  }

  /** One person's photos. Words match captions. */
  static library(owner: User, filters: PhotoFilters = {}) {
    const query = Photo.query().where({ userId: owner.id })
    const text = filters.q?.trim()

    if (text) query.where(matches('caption', text))
    if (filters.visibility) query.where({ visibility: filters.visibility as PhotoVisibility })
    if (filters.space) query.where({ spaceId: filters.space })

    return Photo.narrow(query, filters, 'createdAt')
  }

  /** Filter by shape and order newest or oldest first. Photos without a known size match no shape. */
  private static narrow(query: QueryBuilder<Photo>, filters: PhotoFilters, by: 'publishedAt' | 'createdAt') {
    if (filters.orientation === 'landscape') query.whereColumn('width', '>', 'height')
    if (filters.orientation === 'portrait') query.whereColumn('width', '<', 'height')
    if (filters.orientation === 'square') query.whereColumn('width', '=', 'height')

    return filters.sort === 'oldest' ? query.oldest(by) : query.latest(by)
  }

  /** Show or hide the photo on Explore. Publishing again moves it back to the top. */
  setVisibility(visibility: PhotoVisibility): void {
    if (visibility === this.visibility) return

    this.visibility = visibility
    this.publishedAt = visibility === 'public' ? new Date() : null
  }

  /** The owner's public books that use this photo, with the first page it is on. */
  async publicBooks(): Promise<{ book: Book; page: number }[]> {
    const pages = await BookPage.query()
      .whereJsonContains('photoIds', [this.id])
      .whereHas('book', (query) => query.where({ userId: this.userId, visibility: 'public' }))
      .oldest('position')
      .get()

    const firstPage = new Map<string, number>()

    for (const page of pages.all()) if (!firstPage.has(page.bookId)) firstPage.set(page.bookId, page.position)

    if (!firstPage.size) return []

    const books = await Space.listedOnly(Book.query().whereIn('id', [...firstPage.keys()] as never))
      .latest('publishedAt')
      .get()

    return books.all().map((book) => ({ book, page: firstPage.get(book.id)! }))
  }

  /** Whether the licence lets anyone download the original. */
  allowsDownload(): boolean {
    return this.license !== 'all-rights-reserved'
  }

  /** The original file as an attachment, named after the caption. */
  async download(): Promise<Response> {
    const bytes = await Storage.disk(this.disk as never).getBytes(this.path)
    const name = (this.caption ?? 'photo').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'photo'
    const extension = Photo.EXTENSIONS[this.mimeType] ?? 'bin'

    return new Response(bytes as BodyInit, {
      headers: {
        'Content-Type': this.mimeType,
        'Content-Disposition': `attachment; filename="${name}-toneflix-photos.${extension}"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  /** Only the path is stored; the URL is signed on every read because bucket URLs expire. */
  url(): Promise<string> {
    return Storage.disk(this.disk as never).getSignedUrl(this.path, { expiresIn: '6h' })
  }

  /** Delete the photo and its file, taking it out of every book first. */
  async remove(): Promise<void> {
    await Book.query().where({ userId: this.userId, coverPhotoId: this.id }).update({ coverPhotoId: null })

    const pages = await BookPage.query()
      .whereHas('book', (query) => query.where({ userId: this.userId }))
      .get()

    for (const page of pages.all()) {
      if (!page.photoIds?.includes(this.id)) continue

      await page.update(BookPage.place(page.placements().filter(({ id }) => id !== this.id)))
    }

    await this.delete()
    await Storage.disk(this.disk as never)
      .delete(this.path)
      .catch(() => undefined)
  }

  /** Whether the photo's space lets `viewer` see it. Photos outside a space always do. */
  async isListedFor(viewer: User | null): Promise<boolean> {
    const space = await this.space().first()

    return !space || space.isVisibleTo(viewer)
  }

  user() {
    return this.belongsTo(User, 'userId')
  }

  space() {
    return this.belongsTo(Space, 'spaceId')
  }
}
