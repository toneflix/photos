import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { abortIf } from '@arkstack/common'
import { Storage } from '@arkstack/filesystem'
import { FlipbookModel, type BookWithPages } from '@photos/types'
import type { FlipbookBook, FlipbookPhoto } from '@toneflix/flipbook-core'
import type { Page, Route } from 'playwright-core'
import { BookDetailResource } from '@app/http/resources/BookDetailResource'
import { Photo } from '@app/models/Photo'
import type { BookAccess } from '@app/policies/BookAccess'
import { PhotoImage } from '@app/support/PhotoImage'
import { PrintBrowser } from '@app/support/PrintBrowser'
import { BookArchive } from './BookArchive'
import { BookPageImages } from './BookPageImages'
import { PrintCache, type PrintFormat } from './PrintCache'

/** The flipbook library's script build, as the print page loads it. */
declare const Flipbook: {
  FlipbookPrint: new (container: HTMLElement, book: FlipbookBook, options: { width: number }) => { ready(): Promise<void> }
}

const require = createRequire(import.meta.url)

/**
 * A book's designed pages as a print-ready PDF or one image per page, drawn in Cloudflare Browser Run (see `PrintBrowser`) by the flipbook library's
 * print layout, so every page matches the reader. Photos print from their originals at print size.
 * Books are drawn one at a time, and each drawing is kept until the book changes (see `PrintCache`).
 */
export class BookPrint {
  /** The made-up origin the page, the library and the photos are served from inside the browser. */
  static readonly ORIGIN = 'https://print.photos.local'

  private static queue: Promise<unknown> = Promise.resolve()

  private constructor(
    private readonly access: BookAccess,
    readonly model: FlipbookBook,
    readonly photos: Map<string, Photo>,
  ) {}

  static async for(access: BookAccess): Promise<BookPrint> {
    const detail = (await new BookDetailResource(access.book).for(access).data()) as unknown as BookWithPages
    const shown = [detail.coverPhoto, ...detail.pages.flatMap((page) => page.photos)].filter((photo) => !!photo)
    const sources = new Map(shown.map((photo) => [photo.url, `${BookPrint.ORIGIN}/photos/${photo.id}`]))
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

  /** What each printed page is called, in order: cover, title, the numbered pages, colophon and back. */
  get sheetNames(): string[] {
    return ['cover', 'title', ...this.model.pages.map((_, index) => `page-${index + 1}`), 'colophon', 'back']
  }

  /** Identifies this version of the book's drawing: its layout and the photo files it prints. */
  get fingerprint(): string {
    const photos = [...this.photos.values()].map((photo) => [photo.id, photo.path, photo.displayPath])

    return PrintCache.fingerprint([this.model, photos])
  }

  /** The book as one print-ready PDF, or its pages as images in a zip: the kept drawing when the book hasn't changed, else a new one. */
  async response(format: PrintFormat): Promise<Response> {
    const cache = new PrintCache(this.access.book.id, format, this.fingerprint)
    const kept = await cache.read()

    abortIf(!kept && !PrintBrowser.available, 'Page downloads are not available right now. Please try again later.', 503)

    const body = kept ?? cache.keep(format === 'pdf' ? await this.pdf() : new BookPageImages(this).stream())

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
    const pdf = await this.session((page) => page.pdf({ preferCSSPageSize: true, printBackground: true }))

    return new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(pdf))
        controller.close()
      },
    })
  }

  /** Each page as a PNG at the print resolution, handed over one at a time in reading order. */
  eachImage(take: (name: string, png: Buffer) => void): Promise<void> {
    const names = this.sheetNames

    return this.session(async (page) => {
      const sheets = await page.locator('.fb-print-sheet').all()

      for (const [index, sheet] of sheets.entries()) take(names[index] ?? `sheet-${index + 1}`, await sheet.screenshot({ type: 'png' }))
    })
  }

  /** Lays the book out in a fresh browser and runs `work` on it, once every book queued before it is done. */
  private session<T>(work: (page: Page) => Promise<T>): Promise<T> {
    const turn = BookPrint.queue.then(() => this.open(work))

    BookPrint.queue = turn.catch(() => undefined)

    return turn
  }

  private async open<T>(work: (page: Page) => Promise<T>): Promise<T> {
    const timeout = Number(config('print.timeout') ?? 180) * 1000
    const width = Number(config('print.page_width_mm') ?? 210)
    const scale = Number(config('print.image_dpi') ?? 300) / 96
    const browser = await PrintBrowser.open()

    try {
      const page = await (await browser.newContext({ deviceScaleFactor: scale })).newPage()

      page.setDefaultTimeout(timeout)
      await page.route(`${BookPrint.ORIGIN}/**`, (route) => this.serve(route))
      await page.goto(`${BookPrint.ORIGIN}/`)
      await page.evaluate(
        async ({ book, width }) => {
          await new Flipbook.FlipbookPrint(document.getElementById('book')!, book, { width }).ready()
        },
        { book: this.model, width },
      )

      return await work(page)
    } finally {
      await browser.close()
    }
  }

  /** Everything the page asks for: itself, the library, its fonts and the book's photos. */
  private async serve(route: Route) {
    const [, kind = '', ...rest] = decodeURIComponent(new URL(route.request().url()).pathname).split('/')
    const file = rest.join('/')

    if (!kind) return route.fulfill({ contentType: 'text/html', body: await BookPrint.document() })
    if (kind === 'flipbook') return BookPrint.send(route, BookPrint.directory('@toneflix/flipbook'), file)
    if (kind === 'fonts') return BookPrint.send(route, BookPrint.fontDirectory(), file)

    const photo = kind === 'photos' ? this.photos.get(file) : null
    const image = photo ? await this.image(photo) : null

    return image ? route.fulfill({ contentType: image.mimeType, body: image.bytes }) : route.fulfill({ status: 404 })
  }

  /** A file from a package directory, never from outside it. */
  private static send(route: Route, directory: string, file: string) {
    const target = path.resolve(directory, file)

    if (!file || !target.startsWith(`${directory}${path.sep}`)) return route.fulfill({ status: 404 })

    return route.fulfill({ path: target }).catch(() => route.fulfill({ status: 404 }))
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

  /** The page the book is laid out on, with Fraunces served locally as the book face. */
  private static async document(): Promise<string> {
    const faces = await Promise.all(
      ['opsz.css', 'opsz-italic.css'].map((file) => readFile(path.join(BookPrint.fontDirectory(), '..', file), 'utf8')),
    )
    const fonts = faces.join('\n').replaceAll("'Fraunces Variable'", "'Fraunces'").replaceAll('./files/', '/fonts/')

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="/flipbook/style.css" />
    <style>${fonts} body { margin: 0; }</style>
  </head>
  <body>
    <main id="book"></main>
    <script src="/flipbook/flipbook.iife.js"></script>
  </body>
</html>`
  }

  private static directory(name: string): string {
    return path.dirname(require.resolve(name))
  }

  private static fontDirectory(): string {
    return path.join(path.dirname(require.resolve('@fontsource-variable/fraunces')), 'files')
  }
}
