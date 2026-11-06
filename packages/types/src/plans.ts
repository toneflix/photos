/** Every feature a plan can grant or limit. */
export type FeatureKey =
  | 'max_storage'
  | 'max_photo_size'
  | 'max_books'
  | 'max_book_pages'
  | 'max_spaces'
  | 'public_spaces'
  | 'access_codes'
  | 'transfer_codes'
  | 'premium_covers'
  | 'premium_layouts'
  | 'custom_kicker'
  | 'brand_imprint'
  | 'custom_imprint'
  | 'book_zip'
  | 'original_downloads'
  | 'custom_frames'
  | 'book_stats'
  | 'badge'

/** A toggle is on or off; a limit is a number where 0 means no limit. */
export type FeatureValue = boolean | number

export interface PlanFeature {
  key: FeatureKey
  title: string
  description: string
  type: 'toggle' | 'limit'
  unit: string | null
  value: FeatureValue
}

/** One way to pay: a number of billing periods at once and its price after discount. */
export interface PlanBilling {
  cycles: number
  discount: number
  price: number
  saved: number
}

/** A plan as the pricing page shows it, with the features it lists. */
export interface Plan {
  id: string
  slug: string
  name: string
  description: string | null
  price: number
  currency: string
  interval: 'day' | 'week' | 'month' | 'year'
  intervalCount: number
  billing: PlanBilling[]
  isDefault: boolean
  features: PlanFeature[]
}

/** The signed-in account's plan, every feature value, and what it uses. */
export interface AccountPlan {
  premium: boolean
  endsAt: string | null
  plan: Plan
  features: Record<FeatureKey, FeatureValue>
  usage: {
    storage: { used: number; limit: number }
    books: number
    spaces: number
  }
}
