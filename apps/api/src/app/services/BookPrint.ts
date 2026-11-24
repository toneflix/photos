import { Storage } from '@arkstack/filesystem'
import { FlipbookModel, type BookWithPages } from '@photos/types'
import type { FlipbookBook, FlipbookPhoto } from '@toneflix/flipbook-core'
import { BookPrinter } from '@toneflix/flipbook-print'
import sharp from 'sharp'
import { BookDetailResource } from '@app/http/resources/BookDetailResource'
import { Photo } from '@app/models/Photo'
import type { BookAccess } from '@app/policies/BookAccess'
import { PhotoImage } from '@app/support/PhotoImage'
import { BookArchive } from './BookArchive'
import { BookPageImages } from './BookPageImages'
import { PrintCache, type PrintFormat } from './PrintCache'

/**
 * A book's designed pages as a print-ready PDF or one image per page, drawn on the API by the flipbook
 * library's printer (Skia, no browser) from the same page layout the reader uses. Photos print from
 * their originals at print size. Books are drawn one at a time, and each drawing is kept until the book
 * changes (see `PrintCache`).
 */
export class BookPrint {
  /** How the book's photos are named in the printed model, so the printer asks for them by id. */
  static readonly SOURCE = 'photo:'

  /** A transparent pixel, printed in place of a photo whose file can't be read. */
  private static missing: Promise<Buffer> | undefined

  private static queue: Promise<unknown> = Promise.resolve()

  private constructor(
    private readonly access: BookAccess,
    readonly model: FlipbookBook,
    readonly photos: Map<string, Photo>,
  ) {}

  static async for(access: BookAccess): Promise<BookPrint> {
    const detail = (await new BookDetailResource(access.book).for(access).data()) as unknown as BookWithPages
    const shown = [detail.coverPhoto, ...detail.pages.flatMap((page) => page.photos)].filter((photo) => !!photo)
    const sources = new Map(shown.map((photo) => [photo.url, `${BookPrint.SOURCE}${photo.id}`]))
    const ids = [...new Set(shown.map((photo) => photo.id))]
    const photos = ids.length ? (await Photo.query().whereIn('id', ids as never).get()).all() : []
    const model = FlipbookModel.book(detail)
    const printed = <T extends FlipbookPhoto | null | undefined>(photo: T): T => (photo ? { ...photo, src: sources.get(photo.src) ?? photo.src } : photo)

    const book: FlipbookBook = {
      ...model,
      cover: printed(model.cover),
      pages: model.pages.map((page) => ({ ...page, photos: page.photos.map(printed) })),
    }

    return new BookPrint(access, book, new Map(photos.map((photo) => [photo.id, photo])))
  }

  get isEmpty(): boolean {
    return !this.model.pages.length
  }

  /** The file name for this book's pages, ending in the given extension. */
  filename(extension: 'pdf' | 'zip'): string {
    return `${BookArchive.slug(this.access.book.title, 'book')}-pages-toneflix-photos.${extension}`
  }

  /** What each printed page is called, in order: cover, title, the numbered pages (a panorama as its left and right halves), colophon and back. */
  get sheetNames(): string[] {
    return this.printer().names
  }

  /** Identifies this version of the book's drawing: its layout and the photo files it prints. */
  get fingerprint(): string {
    const photos = [...this.photos.values()].map((photo) => [photo.id, photo.path, photo.displayPath])

    return PrintCache.fingerprint([this.model, photos])
  }

  /** The book as one print-ready PDF, or its pages as images in a zip: the kept drawing when the book hasn't changed, else a new one. */
  async response(format: PrintFormat): Promise<Response> {
    const cache = new PrintCache(this.access.book.id, format, this.fingerprint)
    const body = (await cache.read()) ?? cache.keep(format === 'pdf' ? await this.pdf() : new BookPageImages(this).stream())

    return new Response(body, {
      headers: {
        'Content-Type': format === 'pdf' ? 'application/pdf' : 'application/zip',
        'Content-Disposition': `attachment; filename="${this.filename(format === 'pdf' ? 'pdf' : 'zip')}"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  /** The book drawn as one print-ready PDF. */
  private async pdf(): Promise<ReadableStream<Uint8Array>> {
    const pdf = await this.session((printer) => printer.pdf())

    return new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(pdf))
        controller.close()
      },
    })
  }

  /** Each page as a PNG at the print resolution, handed over one at a time in reading order. */
  eachImage(take: (name: string, png: Buffer) => void): Promise<void> {
    return this.session(async (printer) => {
      for (const [index, face] of printer.faces.entries()) {
        const { data, width, height } = await printer.pixels(face)
        const png = await sharp(data, { raw: { width, height, channels: 4 } })
          .removeAlpha()
          .png({ compressionLevel: 3 })
          .toBuffer()

        take(printer.names[index], png)
      }
    })
  }

  /** Runs `work` on a printer for this book, once every book queued before it is done. */
  private session<T>(work: (printer: BookPrinter) => Promise<T>): Promise<T> {
    const turn = BookPrint.queue.then(() => work(this.printer()))

    BookPrint.queue = turn.catch(() => undefined)

    return turn
  }

  private printer(): BookPrinter {
    return new BookPrinter(this.model, {
      shortSide: Number(config('print.page_short_side_mm') ?? 210),
      dpi: Number(config('print.image_dpi') ?? 300),
      load: (src) => this.load(src),
    })
  }

  /** A photo's bytes for the printer, by the source the printed model gave it. */
  private async load(src: string): Promise<Buffer> {
    const photo = src.startsWith(BookPrint.SOURCE) ? this.photos.get(src.slice(BookPrint.SOURCE.length)) : undefined
    const image = photo ? await this.image(photo).catch(() => null) : null

    return image?.bytes ?? (await BookPrint.blank())
  }

  /** A photo at print size, from its original; formats that can't be re-encoded print from the display copy. */
  private async image(photo: Photo): Promise<{ bytes: Buffer; mimeType: string } | null> {
    const edge = Number(config('print.photo_max_edge') ?? 3300)
    const disk = Storage.disk(photo.disk as never)
    const original = Buffer.from(await disk.getBytes(photo.path).catch(() => new Uint8Array()))
    const printed = original.length
      ? await new PhotoImage(original, photo.mimeType).render({ width: edge, height: edge, quality: 90, mimeType: 'image/jpeg' }, 'inside').catch(() => null)
      : null

    if (printed) return printed
    if (!photo.displayPath) return null

    return { bytes: Buffer.from(await disk.getBytes(photo.displayPath)), mimeType: 'image/webp' }
  }

  private static blank(): Promise<Buffer> {
    BookPrint.missing ??= sharp({ create: { width: 1, height: 1, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .png()
      .toBuffer()

    return BookPrint.missing
  }
}
