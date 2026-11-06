import { Zip, ZipPassThrough, strToU8 } from 'fflate'

/**
 * A zip streamed straight to the response. Subclasses name it and write its entries.
 */
export abstract class ZipArchive {
  abstract filename(): string

  protected abstract write(zip: Zip): Promise<void>

  response(): Response {
    return new Response(this.stream(), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${this.filename()}"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  stream(): ReadableStream<Uint8Array> {
    return new ReadableStream({
      start: async (controller) => {
        const zip = new Zip((error, chunk, final) => {
          if (error) return controller.error(error)

          controller.enqueue(chunk)

          if (final) controller.close()
        })

        try {
          await this.write(zip)
          zip.end()
        } catch (error) {
          zip.terminate()
          controller.error(error)
        }
      },
    })
  }

  /** Store a file as it is. Photos are already compressed, so they are not deflated again. */
  protected addFile(zip: Zip, name: string, bytes: Uint8Array) {
    const entry = new ZipPassThrough(name)

    zip.add(entry)
    entry.push(bytes, true)
  }

  protected addJson(zip: Zip, name: string, value: unknown) {
    this.addFile(zip, name, strToU8(JSON.stringify(value, null, 2)))
  }
}
