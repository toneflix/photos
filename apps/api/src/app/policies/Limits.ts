import { Feature, type FeatureKey } from './Feature'
import type { Book } from '@app/models/Book'
import { Photo } from '@app/models/Photo'
import { Plan } from '@app/models/Plan'
import type { User } from '@app/models/User'
import { ValidationException } from 'kanun'
import { abortIf } from '@arkstack/common'
import { where } from 'arkormx'
import { Cache } from '@arkstack/cache'

const MB = 1024 * 1024

/** The largest photo upload when a plan sets no limit, matching the most the upload setting allows. */
const PHOTO_CEILING_MB = 200

/**
 * What one account's plan lets it do, and the checks that stop it going further.
 * Every plan limit is enforced here. A limit of 0 means no limit.
 */
export class Limits {
  private constructor(
    readonly user: User | null,
    readonly plan: Plan,
  ) {}

  static async for(user: User | null): Promise<Limits> {
    return new Limits(user, user ? await user.plan() : await Plan.default())
  }

  async get(key: FeatureKey): Promise<number> {
    return Number(await this.plan.feature(key))
  }

  async allows(key: FeatureKey): Promise<boolean> {
    return Boolean(await this.plan.feature(key))
  }

  /** Stop with a field error when the plan doesn't include a feature. */
  async ensureAllowed(key: FeatureKey, field: string, message?: string): Promise<void> {
    if (await this.allows(key)) return

    await this.fail(field, message ?? `${Feature.find(key)!.title} is not included in your plan.`)
  }

  /** Stop when the account already has as many as the limit allows. `:limit` in the message is replaced with the limit. */
  async ensureBelow(key: FeatureKey, current: number, field: string, message: string): Promise<void> {
    await this.ensureAtMost(key, current + 1, field, message)
  }

  /** Stop when `count` is over the limit. */
  async ensureAtMost(key: FeatureKey, count: number, field: string, message: string): Promise<void> {
    const limit = await this.get(key)

    if (limit > 0 && count > limit) await this.fail(field, message.replace(':limit', String(limit)))
  }

  /** The largest photo upload, in kilobytes, for the upload rule. */
  async photoKb(): Promise<number> {
    return ((await this.get('max_photo_size')) || PHOTO_CEILING_MB) * 1024
  }

  /** The biggest photo any plan accepts, for the upload parser, which runs before the account is known. */
  static async largestPhotoMb(): Promise<number> {
    return Cache.remember(Plan.LARGEST_PHOTO_CACHE_KEY, 300, async () => {
      const plans = [...(await Plan.query().get()).all(), await Plan.default()]
      const sizes = await Promise.all(plans.map((plan) => plan.feature('max_photo_size')))

      return Math.max(...sizes.map((size) => Number(size) || PHOTO_CEILING_MB))
    })
  }

  /** Bytes the account's photos take up and its storage limit, 0 meaning no limit. */
  async storage(): Promise<{ used: number; limit: number }> {
    const used = this.user ? Number((await (await this.user.photos().getQuery()).sum('size')) ?? 0) : 0

    return { used, limit: (await this.get('max_storage')) * MB }
  }

  /** Stop when a new file of `bytes` wouldn't fit in the account's storage. */
  async ensureRoomFor(bytes: number, field = 'photo'): Promise<void> {
    const { used, limit } = await this.storage()

    if (limit > 0 && used + bytes > limit) {
      await this.fail(field, `This photo needs ${Limits.readable(bytes)}, but only ${Limits.readable(Math.max(0, limit - used))} of your ${Limits.readable(limit)} is free.`)
    }
  }

  async ensureCanCreateBook(): Promise<void> {
    const books = this.user ? await this.user.books().count() : 0

    await this.ensureBelow('max_books', books, 'title', 'Your plan allows :limit books.')
  }

  async ensureCanCreateSpace(): Promise<void> {
    const spaces = this.user ? await this.user.spaces().count() : 0

    await this.ensureBelow('max_spaces', spaces, 'name', 'Your plan allows :limit spaces.')
  }

  /** Spaces can go public only on plans with public spaces. Going private is always allowed. */
  async ensureSpaceVisibility(visibility: string | null | undefined): Promise<void> {
    if (visibility === 'public') await this.ensureAllowed('public_spaces', 'visibility', 'Public spaces are not included in your plan.')
  }

  async ensurePageCount(count: number, field = 'pages'): Promise<void> {
    await this.ensureAtMost('max_book_pages', count, field, 'Books on your plan can have :limit pages.')
  }

  async ensureCanIssueCode(book: Book): Promise<void> {
    const codes = await book.codes().count()

    await this.ensureBelow('access_codes', codes, 'label', 'Your plan allows :limit access codes for each book.')
  }

  /** Codes may only carry `transfer` on plans that hand books to clients. A code that already has it keeps it. */
  async ensureCodePermissions(permissions: string[] | null | undefined, current: string[] = []): Promise<void> {
    if (permissions?.includes('transfer') && !current.includes('transfer')) {
      await this.ensureAllowed('transfer_codes', 'permissions', 'Codes that hand a book to a client are not included in your plan.')
    }
  }

  /** A new cover design must be on the plan. The design a book already has can stay. */
  async ensureCoverDesign(design: string | null | undefined, current?: string): Promise<void> {
    if (!design || design === current || Feature.FREE_COVERS.includes(design)) return

    await this.ensureAllowed('premium_covers', 'coverDesign', 'This cover design is not included in your plan.')
  }

  /** New pages and changed layouts must be on the plan. Pages that already use a layout keep it. */
  async ensurePageLayouts(layouts: Array<string | null | undefined>, current: string[] = []): Promise<void> {
    const added = layouts.filter((layout): layout is string => !!layout && !Feature.FREE_LAYOUTS.includes(layout) && !current.includes(layout))

    if (added.length) await this.ensureAllowed('premium_layouts', 'pages', 'Some of these page layouts are not included in your plan.')
  }

  /** Free plans download sized copies up to the large preset; full-size originals need `original_downloads`. */
  async ensureDownloadSize(request: { size?: string | null; width?: number | string | null; height?: number | string | null }): Promise<void> {
    if (await this.allows('original_downloads')) return

    const largest = Photo.DOWNLOAD_SIZES.large
    const custom = Math.max(Number(request.width) || 0, Number(request.height) || 0)
    const original = custom ? custom > largest : !request.size || request.size === 'original'

    abortIf(original, `Full-size downloads are not included in your plan. Pick a size up to ${largest}px.`, 403)
  }

  static readable(bytes: number): string {
    if (bytes >= 1024 * MB) return `${Math.round((bytes / (1024 * MB)) * 10) / 10} GB`
    if (bytes >= MB) return `${Math.round((bytes / MB) * 10) / 10} MB`

    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  /** Throw a field error, telling the user to upgrade when a bigger plan is on offer. */
  private async fail(field: string, message: string): Promise<never> {
    const canUpgrade = await Plan.scope('onOffer')
      .where(where('price', '>', this.plan.price ?? 0))
      .exists()

    throw ValidationException.withMessages({ [field]: canUpgrade ? `${message} Upgrade your plan for more.` : message })
  }
}
