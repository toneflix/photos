import type { BookAccess } from '@app/policies/BookAccess'
import type { Photo } from '@app/models/Photo'
import { Storage } from '@arkstack/filesystem'
import type { Zip } from 'fflate'
import { ZipArchive } from './ZipArchive'

/**
 * A book's original photo files in reading order, as a zip. Holds only the photos the visitor may download;
 * `total` counts every photo in the book.
 */
export class BookArchive extends ZipArchive {
  private constructor(
    private readonly access: BookAccess,
    readonly photos: Photo[],
    readonly total: number,
  ) {
    super()
  }

  static async for(access: BookAccess): Promise<BookArchive> {
    const photos = await access.book.orderedPhotos()

    return new BookArchive(
      access,
      photos.filter((photo) => access.mayDownload(photo)),
      photos.length,
    )
  }

  get isEmpty(): boolean {
    return !this.photos.length
  }

  filename(): string {
    return `${BookArchive.slug(this.access.book.title, 'book')}-toneflix-photos.zip`
  }

  protected async write(zip: Zip) {
    const width = String(this.photos.length).length

    for (const [index, photo] of this.photos.entries()) {
      const bytes = await Storage.disk(photo.disk as never)
        .getBytes(photo.path)
        .catch(() => null)
      const name = BookArchive.slug((photo.originalName ?? '').replace(/\.[^.]+$/, '') || photo.caption, 'photo')

      if (bytes) this.addFile(zip, `${String(index + 1).padStart(width, '0')}-${name}${photo.path.slice(photo.path.lastIndexOf('.'))}`, bytes)
    }
  }

  /** A file name part from free text, or the fallback when nothing is left. */
  static slug(text: string | null | undefined, fallback: string): string {
    return (text ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || fallback
  }
}
