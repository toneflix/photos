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

/** Which part of a photo shows and how far it is zoomed: x and y from 0 to 100, zoom within PHOTO_ZOOM. Each is optional. */
export class PhotoPositionRule extends ValidationRule {
  validate(attribute: string, value: any, fail: (message: string) => any): void {
    if (typeof value !== 'object' || Array.isArray(value)) return fail(`The ${attribute} must be an object with x, y and zoom.`)

    const limits = { x: [0, 100], y: [0, 100], zoom: [PHOTO_ZOOM.min, PHOTO_ZOOM.max] } as const

    for (const [key, [min, max]] of Object.entries(limits)) {
      const part = value[key]

      if (part === null || part === undefined) continue
      if (typeof part !== 'number' && (typeof part !== 'string' || part.trim() === '')) return fail(`The ${attribute}.${key} must be a number.`)
      if (!(Number(part) >= min && Number(part) <= max)) return fail(`The ${attribute}.${key} must be between ${min} and ${max}.`)
    }
  }
}

/** Rules for a photo position at `attribute`, which may be null for the centre. */
export const photoPosition = (attribute: string) => ({
  [attribute]: ['nullable', new PhotoPositionRule()],
})
