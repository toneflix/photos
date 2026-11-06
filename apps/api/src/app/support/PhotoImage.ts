import sharp, { type Sharp } from 'sharp'
import { ImageFile } from './ImageFile'

/** An encoded image and its upright size. */
export interface EncodedImage {
  bytes: Buffer
  mimeType: string
  width: number
  height: number
}

export interface RenderOptions {
  width?: number | null
  height?: number | null
  quality?: number
  mimeType?: string
}

/**
 * Re-encodes and resizes photos, such as originals that must fit a size cap.
 * Formats without an encoder here (HEIC) are left as they are.
 */
export class PhotoImage {
  /** Types this class can write, with their sharp format. */
  static readonly FORMATS: Record<string, 'jpeg' | 'png' | 'webp' | 'avif' | 'gif'> = {
    'image/jpeg': 'jpeg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/gif': 'gif',
  }

  /** Qualities tried at full size before an original is scaled down to fit its cap. */
  static readonly QUALITIES = [88, 78]

  /** The most re-encodes spent fitting one original under its cap. */
  static readonly MAX_ATTEMPTS = 8

  constructor(
    readonly bytes: Buffer,
    readonly mimeType: string,
  ) {}

  get editable(): boolean {
    return this.mimeType in PhotoImage.FORMATS
  }

  /**
   * The same photo in the same format, at most `maxBytes` long: quality is lowered first, then the
   * size, keeping its colour profile and camera details. Null when it already fits or can't be re-encoded.
   */
  async fitWithin(maxBytes: number): Promise<EncodedImage | null> {
    if (this.bytes.length <= maxBytes || !this.editable) return null

    const quality = PhotoImage.QUALITIES.at(-1)
    let best = await this.render({ quality: PhotoImage.QUALITIES[0] })

    for (const step of PhotoImage.QUALITIES.slice(1)) {
      if (best.bytes.length <= maxBytes) return best

      best = await this.render({ quality: step })
    }

    for (let attempt = PhotoImage.QUALITIES.length; attempt < PhotoImage.MAX_ATTEMPTS && best.bytes.length > maxBytes; attempt++) {
      const shrink = Math.sqrt(maxBytes / best.bytes.length) * 0.95

      best = await this.render({ width: Math.max(1, Math.round(best.width * shrink)), height: Math.max(1, Math.round(best.height * shrink)), quality })
    }

    return best
  }

  /** Encode with the given size and quality. Without a size the photo keeps its own. */
  async render(options: RenderOptions, fit: 'inside' | 'cover' | 'fill' = 'fill'): Promise<EncodedImage> {
    const mimeType = options.mimeType ?? this.mimeType
    const format = PhotoImage.FORMATS[mimeType] ?? 'jpeg'
    const quality = options.quality ?? 90
    let image = this.pipeline()

    if (options.width || options.height) {
      image = image.resize({ width: options.width ?? undefined, height: options.height ?? undefined, fit, withoutEnlargement: true })
    }

    image = PhotoImage.encode(image, format, quality)

    const { data, info } = await image.toBuffer({ resolveWithObject: true })

    return { bytes: data, mimeType: format === 'jpeg' ? 'image/jpeg' : `image/${format}`, width: info.width, height: info.pageHeight ?? info.height }
  }

  private pipeline(): Sharp {
    return sharp(this.bytes, { animated: this.mimeType === 'image/gif', limitInputPixels: ImageFile.MAX_PIXELS }).autoOrient().keepIccProfile().keepExif()
  }

  private static encode(image: Sharp, format: string, quality: number): Sharp {
    if (format === 'png') return image.png({ compressionLevel: 9, palette: quality < 88, quality })
    if (format === 'webp') return image.webp({ quality })
    if (format === 'avif') return image.avif({ quality: Math.round(quality * 0.7) })
    if (format === 'gif') return image.gif()

    return image.jpeg({ quality, mozjpeg: true })
  }
}
