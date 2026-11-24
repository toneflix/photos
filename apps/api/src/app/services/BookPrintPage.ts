import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { FlipbookModel, type BookWithPages } from '@photos/types'
import type { FlipbookBook } from '@toneflix/flipbook-core'
import { parseHTML } from 'linkedom'
import { BookDetailResource } from '@app/http/resources/BookDetailResource'
import type { BookAccess } from '@app/policies/BookAccess'

const require = createRequire(import.meta.url)

type Library = typeof import('@toneflix/flipbook')

/**
 * A book laid flat for printing as one self-contained HTML page with no script: the flipbook library's
 * `FlipbookPrint` draws it here on a server-side DOM, its stylesheet, paper textures and the book face are
 * inlined, and photos load from their signed display copies. The page is fully drawn once it has loaded.
 * The web app prints it from a hidden frame; the mobile app hands it to the system print sheet.
 */
export class BookPrintPage {
  private static assets: Promise<{ library: Library; style: string; fonts: string }> | null = null

  private constructor(
    private readonly title: string,
    readonly model: FlipbookBook,
  ) {}

  static async for(access: BookAccess): Promise<BookPrintPage> {
    const detail = (await new BookDetailResource(access.book).for(access).data()) as unknown as BookWithPages

    return new BookPrintPage(access.book.title, FlipbookModel.book(detail))
  }

  get isEmpty(): boolean {
    return !this.model.pages.length
  }

  async response(): Promise<Response> {
    return new Response(await this.html(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' },
    })
  }

  async html(): Promise<string> {
    const { library, style, fonts } = await BookPrintPage.load()
    const width = Number(config('print.page_width_mm') ?? 210)

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${BookPrintPage.escape(this.title)}</title>
    <style>${style}</style>
    <style>${fonts} body { margin: 0; }</style>
  </head>
  <body>
    <main id="book">${BookPrintPage.draw(library, this.model, width)}</main>
  </body>
</html>`
  }

  /** The book's sheets as markup, drawn by `FlipbookPrint` on a throwaway DOM. Drawing is synchronous, so the DOM globals it needs are only lent for the call. */
  private static draw(library: Library, book: FlipbookBook, width: number): string {
    const { window, document } = parseHTML('<!doctype html><html><body><main></main></body></html>')
    const container = document.querySelector('main')!
    const scope = globalThis as Record<string, unknown>
    const lent = { window, document, HTMLElement: window.HTMLElement, SVGElement: window.SVGElement }
    const kept = Object.fromEntries(Object.keys(lent).map((key) => [key, scope[key]]))

    Object.assign(scope, lent)

    try {
      new library.FlipbookPrint(container as unknown as HTMLElement, book, { width })

      return container.innerHTML
    } finally {
      Object.assign(scope, kept)
    }
  }

  /** The library, its stylesheet with the textures inlined, and the Latin Fraunces faces, loaded once. */
  private static load() {
    BookPrintPage.assets ??= (async () => {
      const directory = path.dirname(require.resolve('@toneflix/flipbook'))
      const library = await import('@toneflix/flipbook')
      const fontFiles = path.join(path.dirname(require.resolve('@fontsource-variable/fraunces')), 'files')
      const style = await BookPrintPage.inline(await readFile(path.join(directory, 'style.css'), 'utf8'), /url\('\.\/(textures\/[^']+)'\)/g, directory, 'image/webp')
      const faces = await Promise.all(
        (['normal', 'italic'] as const).map(async (face) => {
          const font = await readFile(path.join(fontFiles, `fraunces-latin-opsz-${face}.woff2`))

          return `@font-face { font-family: 'Fraunces'; font-style: ${face}; font-display: block; font-weight: 100 900;
            src: url(data:font/woff2;base64,${font.toString('base64')}) format('woff2-variations'); }`
        }),
      )

      return { library, style, fonts: faces.join('\n') }
    })()

    return BookPrintPage.assets
  }

  /** Replaces each `url()` the pattern finds with the file's contents as a data URL. */
  private static async inline(css: string, pattern: RegExp, directory: string, mimeType: string): Promise<string> {
    const files = [...new Set([...css.matchAll(pattern)].map((match) => match[1]!))]
    const data = new Map(
      await Promise.all(files.map(async (file) => [file, (await readFile(path.join(directory, file))).toString('base64')] as const)),
    )

    return css.replace(pattern, (_, file: string) => `url('data:${mimeType};base64,${data.get(file)}')`)
  }

  private static escape(text: string): string {
    return text.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]!)
  }
}
