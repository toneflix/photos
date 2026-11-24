import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { Readable } from 'node:stream'
import { Storage } from '@arkstack/filesystem'
import { Photo } from '@app/models/Photo'

const require = createRequire(import.meta.url)

export type PrintFormat = 'pdf' | 'images'

/**
 * Book pages already drawn, kept on the photos disk until the book changes. Each file is named by a
 * fingerprint of everything that shapes it (the laid-out book, its photo files, the print settings and
 * the flipbook version), so a change to any of them draws the book again. Each book keeps one file per
 * format: a new one replaces the old.
 */
export class PrintCache {
  private static readonly ROOT = 'print-cache'
  private static version: string | undefined

  constructor(
    private readonly bookId: string,
    private readonly format: PrintFormat,
    private readonly fingerprint: string,
  ) {}

  /** A fingerprint of the given parts and the settings and library every drawing depends on. */
  static fingerprint(parts: unknown): string {
    const settings = ['page_short_side_mm', 'image_dpi', 'photo_max_edge'].map((key) => config(`print.${key}` as never))
    const library = PrintCache.libraryVersion()

    return createHash('sha256')
      .update(JSON.stringify([parts, settings, library]))
      .digest('hex')
      .slice(0, 32)
  }

  /** The installed flipbook version, read from the package beside its build. */
  private static libraryVersion(): string {
    PrintCache.version ??= String(JSON.parse(readFileSync(path.join(path.dirname(require.resolve('@toneflix/flipbook')), '..', 'package.json'), 'utf8')).version)

    return PrintCache.version
  }

  /** Forgets every drawn file for a book, as when it is deleted. */
  static async forget(bookId: string): Promise<void> {
    await PrintCache.disk()
      .deleteAll(`${PrintCache.ROOT}/books/${bookId}/`)
      .catch(() => undefined)
  }

  private static disk() {
    return Storage.disk(Photo.disk() as never)
  }

  private get folder(): string {
    return `${PrintCache.ROOT}/books/${this.bookId}/${this.format}/`
  }

  private get path(): string {
    return `${this.folder}${this.fingerprint}.${this.format === 'pdf' ? 'pdf' : 'zip'}`
  }

  /** The drawn file, when this exact version of the book has been drawn before. */
  async read(): Promise<ReadableStream<Uint8Array> | null> {
    const disk = PrintCache.disk()

    if (!(await disk.exists(this.path).catch(() => false))) return null

    return Readable.toWeb(await disk.getStream(this.path)) as ReadableStream<Uint8Array>
  }

  /**
   * Passes a freshly drawn file through while keeping a copy. The copy is written aside and only takes
   * the book's place once the whole file has arrived, so a failed drawing is never kept.
   */
  keep(file: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
    const [sent, kept] = file.tee()

    void this.store(kept)

    return sent
  }

  private async store(file: ReadableStream<Uint8Array>) {
    const disk = PrintCache.disk()
    const draft = `${PrintCache.ROOT}/drafts/${randomUUID()}`

    try {
      await disk.putStream(draft, Readable.fromWeb(file as never))
      await disk.deleteAll(this.folder)
      await disk.move(draft, this.path)
    } catch {
      await disk.delete(draft).catch(() => undefined)
    }
  }
}
