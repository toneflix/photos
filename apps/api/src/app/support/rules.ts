import { PHOTO_ZOOM } from '@toneflix/flipbook-core'
import { ImageFile } from './ImageFile'
import { ValidationRule, regex } from 'kanun'

/** A record id. */
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const UUID = regex(UUID_PATTERN)

/** A username: lower case letters, numbers and underscores, 3 to 30 long. */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/

export class Username extends ValidationRule {
  validate(attribute: string, value: any, fail: (message: string) => any): void {
    if (!USERNAME_PATTERN.test(String(value))) fail(`The ${attribute} must be 3 to 30 lower case letters, numbers or underscores.`)
  }
}

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

/** Query rules for a photo download: a preset size or custom dimensions, both optional. */
export const downloadSize = (sizes: string[]) => ({
  size: `nullable|in:original,${sizes.join(',')}`,
  width: 'nullable|integer|min:1|max:12000',
  height: 'nullable|integer|min:1|max:12000',
})

/** Rules for a photo position at `attribute`: which part of the photo shows, and how far it is zoomed. */
export const photoPosition = (attribute: string) => ({
  [attribute]: 'nullable',
  [`${attribute}.x`]: 'nullable|numeric|min:0|max:100',
  [`${attribute}.y`]: 'nullable|numeric|min:0|max:100',
  [`${attribute}.zoom`]: `nullable|numeric|min:${PHOTO_ZOOM.min}|max:${PHOTO_ZOOM.max}`,
})
