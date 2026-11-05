import { imageSize } from 'image-size'

/**
 * An uploaded image as its bytes describe it, rather than as the client labelled it.
 */
export class ImageFile {
  /** Accepted image formats, keyed by the format image-size detects. */
  static readonly TYPES: Record<string, string> = {
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    avif: 'image/avif',
    heic: 'image/heic',
    heif: 'image/heif',
  }

  /** The largest image accepted, in pixels (120 megapixels). */
  static readonly MAX_PIXELS = 120_000_000

  constructor(
    readonly mimeType: string,
    readonly width: number,
    readonly height: number,
  ) {}

  /** Read an upload's real format and upright size, or null when it is not an accepted image. */
  static read(buffer?: Buffer | Uint8Array | null): ImageFile | null {
    if (!buffer?.length) return null

    try {
      const { type, width, height, orientation } = imageSize(new Uint8Array(buffer))
      const mimeType = type ? ImageFile.TYPES[type] : undefined

      if (!mimeType || !width || !height) return null

      return orientation && orientation >= 5 ? new ImageFile(mimeType, height, width) : new ImageFile(mimeType, width, height)
    } catch {
      return null
    }
  }

  get pixels(): number {
    return this.width * this.height
  }
}
