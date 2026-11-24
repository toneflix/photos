import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { Storage } from '@arkstack/filesystem'
import { FlipbookModel, type BookWithPages } from '@photos/types'
import type { FlipbookBook, FlipbookPhoto } from '@toneflix/flipbook-core'
import { chromium, type Route } from 'playwright-core'
import { BookDetailResource } from '@app/http/resources/BookDetailResource'
import { Photo } from '@app/models/Photo'
import type { BookAccess } from '@app/policies/BookAccess'
import { PhotoImage } from '@app/support/PhotoImage'
import { BookArchive } from './BookArchive'

declare const Flipbook: typeof import('@toneflix/flipbook')

const require = createRequire(import.meta.url)

/**
 * A book's designed pages as one print-ready PDF, drawn in headless Chromium by the flipbook library's
 * print layout, so every page matches the reader. Photos print from their originals at print size.
 * Books are drawn one at a time.
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

  filename(): string {
    return `${BookArchive.slug(this.access.book.title, 'book')}-pages-toneflix-photos.pdf`
  }

  async response(): Promise<Response> {
    const pdf = await this.pdf()

    return new Response(pdf as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${this.filename()}"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  /** The PDF, once every book queued before it has been drawn. */
  pdf(): Promise<Buffer> {
    const turn = BookPrint.queue.then(() => this.draw())

    BookPrint.queue = turn.catch(() => undefined)

    return turn
  }

  private async draw(): Promise<Buffer> {
    const timeout = Number(config('print.timeout') ?? 180) * 1000
    const width = Number(config('print.page_width_mm') ?? 210)
    const browser = await chromium.launch({ executablePath: String(config('print.chromium_path') ?? '') || undefined })

    try {
      const page = await browser.newPage()

      page.setDefaultTimeout(timeout)
      await page.route(`${BookPrint.ORIGIN}/**`, (route) => this.serve(route))
      await page.goto(`${BookPrint.ORIGIN}/`)
      await page.evaluate(
        async ({ book, width }) => {
          await new Flipbook.FlipbookPrint(document.getElementById('book')!, book, { width }).ready()
        },
        { book: this.model, width },
      )

      return await page.pdf({ preferCSSPageSize: true, printBackground: true })
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
