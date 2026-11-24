import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { FlipbookModel, type BookWithPages } from '@photos/types'
import type { FlipbookBook } from '@toneflix/flipbook-core'
import { BookDetailResource } from '@app/http/resources/BookDetailResource'
import type { BookAccess } from '@app/policies/BookAccess'

const require = createRequire(import.meta.url)

/**
 * A book laid flat for printing as one self-contained HTML page: the flipbook library, its paper textures
 * and the book face are inlined, and photos load from their signed display copies. The page builds the
 * book while it parses, so it is fully drawn once it has loaded, then tells a parent frame it is ready.
 * The web app prints it from a hidden frame; the mobile app hands it to the system print sheet.
 */
export class BookPrintPage {
  /** The message the page posts to its parent once every photo and font has loaded. */
  static readonly READY = 'toneflix-photos:print-ready'

  private static assets: Promise<{ script: string; style: string; fonts: string }> | null = null

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
    const { script, style, fonts } = await BookPrintPage.load()
    const width = Number(config('print.page_width_mm') ?? 210)
    const book = JSON.stringify(this.model).replaceAll('<', '\\u003c')
    const options = JSON.stringify({ width })

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
    <main id="book"></main>
    <script>${script}</script>
    <script>
      (function () {
        var print = new Flipbook.FlipbookPrint(document.getElementById('book'), ${book}, ${options});
        print.ready().then(function () {
          if (window.parent !== window) window.parent.postMessage(${JSON.stringify(BookPrintPage.READY)}, '*');
        });
      })();
    </script>
  </body>
</html>`
  }

  /** The library's script and stylesheet with its textures inlined, and the Latin Fraunces faces, read once. */
  private static load() {
    BookPrintPage.assets ??= (async () => {
      const library = path.dirname(require.resolve('@toneflix/flipbook'))
      const fontFiles = path.join(path.dirname(require.resolve('@fontsource-variable/fraunces')), 'files')
      const script = (await readFile(path.join(library, 'flipbook.iife.js'), 'utf8')).replaceAll('</script', '<\\/script')
      const style = await BookPrintPage.inline(await readFile(path.join(library, 'style.css'), 'utf8'), /url\('\.\/(textures\/[^']+)'\)/g, library, 'image/webp')
      const faces = await Promise.all(
        (['normal', 'italic'] as const).map(async (style) => {
          const font = await readFile(path.join(fontFiles, `fraunces-latin-opsz-${style}.woff2`))

          return `@font-face { font-family: 'Fraunces'; font-style: ${style}; font-display: block; font-weight: 100 900;
            src: url(data:font/woff2;base64,${font.toString('base64')}) format('woff2-variations'); }`
        }),
      )

      return { script, style, fonts: faces.join('\n') }
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
