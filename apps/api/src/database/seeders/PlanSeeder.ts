import { Feature, type FeatureKey, type FeatureValue } from '@app/policies/Feature'
import { Design } from '@app/policies/Design'
import { Plan } from '@app/models/Plan'
import { Seeder } from '@arkstack/database'

type FeatureValues = Partial<Record<FeatureKey, FeatureValue>>

/**
 * The starting plans: Free, the default for every account, and Premium, the highlighted one, which
 * also gets the premium page layouts. Plans that already exist are left as admins set them, so this
 * is safe to run again.
 */
export class PlanSeeder extends Seeder {
  public async run(): Promise<void> {
    await this.plant({
      slug: 'free',
      name: 'Free',
      description: 'Share photos, gather them in spaces and make photobooks.',
      price: 0,
      isDefault: true,
      sort: 0,
      features: {
        max_storage: 1024,
        max_books: 5,
        max_spaces: 1,
        public_spaces: false,
        space_members: 3,
        access_codes: 1,
        transfer_codes: false,
        premium_covers: false,
        custom_kicker: false,
        brand_imprint: false,
        custom_imprint: false,
        book_zip: false,
        original_downloads: false,
        page_pdf: false,
        page_images: false,
        page_print: false,
        custom_frames: false,
        book_stats: false,
        badge: false,
      },
    })

    const premium = await this.plant({
      slug: 'premium',
      name: 'Premium',
      description: 'More room, your own branding, and photobooks you can hand over.',
      price: 5000,
      isDefault: false,
      isHighlighted: true,
      sort: 1,
      billingOptions: [{ cycles: 12, discount: 20 }],
      features: {
        max_storage: 100_000,
        max_photo_size: 50,
        max_books: 0,
        max_book_pages: 200,
        max_spaces: 0,
        public_spaces: true,
        space_members: 0,
        access_codes: 0,
        transfer_codes: true,
        premium_covers: true,
        custom_kicker: true,
        brand_imprint: true,
        custom_imprint: true,
        book_zip: true,
        original_downloads: true,
        page_pdf: true,
        page_images: true,
        page_print: true,
        custom_frames: true,
        book_stats: true,
        badge: true,
      },
    })

    if (premium) await Design.include(premium, 'layout', Design.PREMIUM_LAYOUTS)

    await Plan.forget()
  }

  /** Create a plan unless one with its slug exists, returning the new plan. Features not listed keep their fallback. */
  private async plant(details: Partial<Omit<Plan, 'features'>> & { slug: string; features: FeatureValues }): Promise<Plan | null> {
    if (await Plan.query().where({ slug: details.slug }).exists()) return null

    const features = Object.fromEntries(
      Object.entries(details.features).map(([key, value]) => [key, { value: Feature.cast(Feature.find(key)!, value), active: true, listed: true }]),
    )

    return Plan.query().create({ currency: 'NGN', interval: 'month', intervalCount: 1, active: true, isHidden: false, isHighlighted: false, ...details, features } as never)
  }
}
