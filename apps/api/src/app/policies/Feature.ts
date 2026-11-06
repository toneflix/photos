import { Settings } from '@app/support/Settings'

export type FeatureKey =
  | 'max_storage'
  | 'max_photo_size'
  | 'max_books'
  | 'max_book_pages'
  | 'max_spaces'
  | 'public_spaces'
  | 'space_members'
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
export type FeatureType = 'toggle' | 'limit'

export type FeatureValue = boolean | number

export interface FeatureDefinition {
  key: FeatureKey
  title: string
  description: string
  type: FeatureType
  unit?: 'MB' | 'pages'
  /** What an account gets when its plan doesn't grant the feature. */
  fallback: FeatureValue
  /** A setting whose value is the fallback, so the admin's app-wide limit stays the free limit. */
  setting?: string
}

/**
 * Everything a plan can grant or limit. Plans store a value for each key; the code
 * checks features by key through `Limits`, so new ones are added here.
 */
export class Feature {
  static readonly ALL: FeatureDefinition[] = [
    {
      key: 'max_storage',
      title: 'Photo storage',
      description: 'Space for the photos in your library.',
      type: 'limit',
      unit: 'MB',
      fallback: 1024,
    },
    {
      key: 'max_photo_size',
      title: 'Largest photo upload',
      description: 'The biggest single photo you can upload.',
      type: 'limit',
      unit: 'MB',
      fallback: 0,
      setting: 'uploads.max_photo_mb',
    },
    {
      key: 'max_books',
      title: 'Photo books',
      description: 'How many books you can make.',
      type: 'limit',
      fallback: 5,
    },
    {
      key: 'max_book_pages',
      title: 'Pages per book',
      description: 'How many pages each book can have.',
      type: 'limit',
      unit: 'pages',
      fallback: 0,
      setting: 'books.max_pages',
    },
    {
      key: 'max_spaces',
      title: 'Spaces',
      description: 'How many spaces you can run.',
      type: 'limit',
      fallback: 1,
    },
    {
      key: 'public_spaces',
      title: 'Public spaces',
      description: 'Give a space its own public page.',
      type: 'toggle',
      fallback: false,
    },
    {
      key: 'space_members',
      title: 'Members per space',
      description: 'How many people you can invite into each space.',
      type: 'limit',
      fallback: 3,
    },
    {
      key: 'access_codes',
      title: 'Access codes per book',
      description: 'How many codes can unlock each book.',
      type: 'limit',
      fallback: 1,
    },
    {
      key: 'transfer_codes',
      title: 'Hand books to clients',
      description: 'Access codes that let a client claim a book you made.',
      type: 'toggle',
      fallback: false,
    },
    {
      key: 'premium_covers',
      title: 'Every cover design',
      description: 'Gilt, window, tipped-in print and art deco covers.',
      type: 'toggle',
      fallback: false,
    },
    {
      key: 'premium_layouts',
      title: 'Every page layout',
      description: 'Collage, triptych, mosaic, film strip, contact sheet, loose prints and story pages.',
      type: 'toggle',
      fallback: false,
    },
    {
      key: 'custom_kicker',
      title: 'Your own cover line',
      description: 'Replace "A Toneflix photo book" on the cover with your own words.',
      type: 'toggle',
      fallback: false,
    },
    {
      key: 'brand_imprint',
      title: 'Your brand on the back cover',
      description: 'Print your brand name on the back cover, above Toneflix Photos.',
      type: 'toggle',
      fallback: false,
    },
    {
      key: 'custom_imprint',
      title: 'Your own back cover',
      description: 'Print your own name on the back cover in place of Toneflix Photos.',
      type: 'toggle',
      fallback: false,
    },
    {
      key: 'book_zip',
      title: 'Book downloads',
      description: 'Let you and your clients download a whole book as a zip.',
      type: 'toggle',
      fallback: false,
    },
    {
      key: 'original_downloads',
      title: 'Original downloads',
      description: 'Download your photos at full size, not only the smaller copies.',
      type: 'toggle',
      fallback: false,
    },
    {
      key: 'custom_frames',
      title: 'Custom frames',
      description: 'Design your own photo frames and reuse them across your books.',
      type: 'toggle',
      fallback: false,
    },
    {
      key: 'book_stats',
      title: 'Book insights',
      description: 'See how often each book and access code is opened.',
      type: 'toggle',
      fallback: false,
    },
    {
      key: 'badge',
      title: 'Premium badge',
      description: 'A Premium mark beside your name and on your spaces.',
      type: 'toggle',
      fallback: false,
    },
  ]

  /** Cover designs and page layouts every plan has. The rest need `premium_covers` and `premium_layouts`. */
  static readonly FREE_COVERS = ['classic', 'image']
  static readonly FREE_LAYOUTS = ['single', 'framed', 'pair', 'grid', 'text']

  static keys(): FeatureKey[] {
    return Feature.ALL.map((feature) => feature.key)
  }

  static find(key: string): FeatureDefinition | undefined {
    return Feature.ALL.find((feature) => feature.key === key)
  }

  /** The value an account gets without the feature: the setting it follows, else the catalogue fallback. */
  static async fallback(feature: FeatureDefinition): Promise<FeatureValue> {
    return feature.setting ? Settings.number(feature.setting) : feature.fallback
  }

  /** A submitted or stored value in the feature's own type. Limits are whole numbers from 0. */
  static cast(feature: FeatureDefinition, value: unknown): FeatureValue {
    if (feature.type === 'toggle') return value === true || value === 'true' || value === 1 || value === '1' || value === 'on'

    return Math.max(0, Math.floor(Number(value) || 0))
  }
}
