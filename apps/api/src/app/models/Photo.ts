import { Book } from './Book'
import { BookPage } from './BookPage'
import { Model } from '@arkstack/database'
import { Storage } from '@arkstack/filesystem'
import { User } from './User'
import { randomUUID } from 'node:crypto'

export type PhotoVisibility = 'private' | 'public'

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
}

export class Photo extends Model {
  declare id: string
  declare userId: string
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
  declare createdAt: Date
  declare updatedAt: Date

  static readonly VISIBILITIES = ['private', 'public']

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

  /** Store an upload under the owner's folder and record its path. */
  static async upload(owner: User, file: UploadedPhoto, details: PhotoDetails = {}): Promise<Photo> {
    const disk = Photo.disk()
    const path = `photos/${owner.id}/${randomUUID()}.${Photo.EXTENSIONS[file.mimetype] ?? 'bin'}`

    await Storage.disk(disk as never).put(path, new Uint8Array(file.buffer))

    return Photo.query().create({
      userId: owner.id,
      disk,
      path,
      originalName: file.originalname?.slice(0, 255) || null,
      mimeType: file.mimetype,
      size: file.size,
      width: details.width ?? null,
      height: details.height ?? null,
      caption: details.caption ?? null,
      takenAt: details.takenAt ? new Date(details.takenAt) : null,
    })
  }

  /** Public photos for the Explore timeline, most recently published first. */
  static published() {
    return Photo.query().where({ visibility: 'public' }).latest('publishedAt')
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

    const books = await Book.query()
      .whereIn('id', [...firstPage.keys()] as never)
      .latest('publishedAt')
      .get()

    return books.all().map((book) => ({ book, page: firstPage.get(book.id)! }))
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

      await page.update({ photoIds: page.photoIds.filter((id) => id !== this.id) })
    }

    await this.delete()
    await Storage.disk(this.disk as never)
      .delete(this.path)
      .catch(() => undefined)
  }

  user() {
    return this.belongsTo(User, 'userId')
  }
}
