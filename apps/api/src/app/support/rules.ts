import { ImageFile } from './ImageFile'
import { ValidationRule, regex } from 'kanun'

/** A record id. */
export const UUID = regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

/** An upload whose bytes are an accepted photo format, no larger than ImageFile.MAX_PIXELS. */
export class PhotoFile extends ValidationRule {
  validate(attribute: string, value: any, fail: (message: string) => any): void {
    const image = ImageFile.read(value?.buffer)

    if (!image) return fail(`The ${attribute} must be a JPEG, PNG, WebP, GIF, AVIF or HEIC image.`)
    if (image.pixels > ImageFile.MAX_PIXELS) fail(`The ${attribute} must not be larger than ${ImageFile.MAX_PIXELS / 1_000_000} megapixels.`)
  }
}

/** Validation rules for a photo upload of at most `maxKilobytes`. */
export const photoFile = (maxKilobytes: number) => ['required', 'file', `max:${maxKilobytes}`, new PhotoFile()]
