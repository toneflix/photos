import { Feature, type FeatureKey, type FeatureValue } from '@app/policies/Feature'
import { Plan } from '@app/models/Plan'
import { Seeder } from '@arkstack/database'

type FeatureValues = Partial<Record<FeatureKey, FeatureValue>>

/**
 * The starting plans: Free, the default for every account, and Premium. Plans that
 * already exist are left as admins set them, so this is safe to run again.
 */
export class PlanSeeder extends Seeder {
  public async run(): Promise<void> {
    await this.plant({
      slug: 'free',
      name: 'Free',
      description: 'Make photo books and share them.',
      price: 0,
      isDefault: true,
      sort: 0,
      features: {
        max_storage: 1024,
        max_books: 5,
        max_spaces: 1,
        public_spaces: false,
        access_codes: 1,
        transfer_codes: false,
        premium_covers: false,
        premium_layouts: false,
        custom_kicker: false,
        brand_imprint: false,
        custom_imprint: false,
        book_zip: false,
        original_downloads: false,
        custom_frames: false,
        book_stats: false,
        badge: false,
      },
    })

    await this.plant({
      slug: 'premium',
      name: 'Premium',
      description: 'For photographers who make books for their clients.',
      price: 5000,
      isDefault: false,
      sort: 1,
      billingOptions: [{ cycles: 12, discount: 20 }],
      features: {
        max_storage: 100_000,
        max_photo_size: 50,
        max_books: 0,
        max_book_pages: 200,
        max_spaces: 0,
        public_spaces: true,
        access_codes: 0,
        transfer_codes: true,
        premium_covers: true,
        premium_layouts: true,
        custom_kicker: true,
        brand_imprint: true,
        custom_imprint: true,
        book_zip: true,
        original_downloads: true,
        custom_frames: true,
        book_stats: true,
        badge: true,
      },
    })

    await Plan.forget()
  }

  /** Create a plan unless one with its slug exists. Features not listed keep their fallback. */
  private async plant(details: Partial<Omit<Plan, 'features'>> & { slug: string; features: FeatureValues }): Promise<void> {
    if (await Plan.query().where({ slug: details.slug }).exists()) return

    const features = Object.fromEntries(
      Object.entries(details.features).map(([key, value]) => [key, { value: Feature.cast(Feature.find(key)!, value), active: true, listed: true }]),
    )

    await Plan.query().create({ currency: 'NGN', interval: 'month', intervalCount: 1, active: true, isHidden: false, ...details, features } as never)
  }
}
