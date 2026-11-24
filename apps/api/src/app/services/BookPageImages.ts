import type { Zip } from 'fflate'
import type { BookPrint } from './BookPrint'
import { ZipArchive } from './ZipArchive'

/** A book's designed pages as PNGs in a zip, numbered in reading order. */
export class BookPageImages extends ZipArchive {
  constructor(private readonly print: BookPrint) {
    super()
  }

  filename(): string {
    return this.print.filename('zip')
  }

  protected async write(zip: Zip) {
    const width = String(this.print.sheetNames.length).length
    let index = 0

    await this.print.eachImage((name, png) => this.addFile(zip, `${String(++index).padStart(width, '0')}-${name}.png`, png))
  }
}
