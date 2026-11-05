/**
 * Core domain models, as the API returns them (camelCase keys, ISO dates).
 */

/** Records use UUID primary keys. */
export type ID = string

/**
 * Who can open a book.
 * - private: only the owner.
 * - shared: anyone with the link.
 * - public: anyone with the link (and, later, listed publicly).
 */
export type Visibility = 'private' | 'shared' | 'public'

export interface User {
  id: ID
  name: string
  email: string
  emailVerified: boolean
  /** Signed URL, generated per response. */
  avatarUrl: string | null
  /** Visibility given to new books. */
  defaultVisibility: Visibility
  /** Whether people opening a shared or public book see the owner's name. */
  showOwnerName: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthToken {
  token: string
  expiresAt: string | null
}

/** A successful sign-in. */
export interface SignedIn extends AuthToken {
  twoFactor: false
  user: User
}

/** The password was right but the account needs an authenticator or recovery code. */
export interface TwoFactorChallenge {
  twoFactor: true
  challengeToken: string
}

export interface TwoFactorStatus {
  enabled: boolean
  enabledAt: string | null
  method: 'authenticator' | 'sms' | null
  recoveryCodesRemaining: number
}

export interface TwoFactorSetup {
  secret: string
  otpauthUrl: string
}

/** A signed-in device. */
export interface Session {
  id: ID
  name: string
  browser: string | null
  os: string | null
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown'
  ipAddress: string | null
  /** True for the device making the request. */
  current: boolean
  lastUsedAt: string | null
  createdAt: string
}

/**
 * A single uploaded photo. The file itself lives on the API's storage disk.
 *
 * The database stores only the file's storage path, never a URL, because S3
 * URLs expire. `url` and `thumbnailUrl` are signed URLs the API creates with
 * `getSignedUrl()` on every response, so they are short-lived: don't persist
 * or cache them on the client.
 */
export interface Photo {
  id: ID
  userId: ID
  /** Signed URL, generated per response. */
  url: string
  /** Signed URL, generated per response. */
  thumbnailUrl: string | null
  width: number | null
  height: number | null
  mimeType: string
  size: number
  caption: string | null
  takenAt: string | null
  createdAt: string
  updatedAt: string
}

/**
 * How the photos on a page are arranged.
 * - single: one photo, full bleed.
 * - framed: one photo on a matte with its caption below.
 * - pair: two photos side by side (or stacked on tall pages).
 * - grid: up to four photos in a 2×2 grid.
 * - collage: one large photo over two smaller ones.
 * - text: no photos, just the caption set as a page of writing.
 */
export type PageLayout = 'single' | 'framed' | 'pair' | 'grid' | 'collage' | 'text'

export const PAGE_LAYOUTS: Record<PageLayout, { label: string; maxPhotos: number }> = {
  single: { label: 'Full bleed', maxPhotos: 1 },
  framed: { label: 'Framed', maxPhotos: 1 },
  pair: { label: 'Pair', maxPhotos: 2 },
  grid: { label: 'Grid', maxPhotos: 4 },
  collage: { label: 'Collage', maxPhotos: 3 },
  text: { label: 'Words', maxPhotos: 0 },
}

/** The look of a book's cover and paper. */
export type BookTheme = 'classic' | 'linen' | 'midnight'

/** The colour of the pages inside a book. */
export type PaperColor = 'ivory' | 'white' | 'kraft' | 'charcoal'

export const PAPER_COLORS: Record<PaperColor, { label: string; swatch: string }> = {
  ivory: { label: 'Ivory', swatch: '#fbf8f1' },
  white: { label: 'White', swatch: '#ffffff' },
  kraft: { label: 'Kraft', swatch: '#d8c4a2' },
  charcoal: { label: 'Charcoal', swatch: '#2a2826' },
}

/** A photo book: an ordered collection of photos laid out on pages. */
export interface Book {
  id: ID
  userId: ID
  title: string
  description: string | null
  coverPhotoId: ID | null
  coverPhoto?: Photo | null
  visibility: Visibility
  theme: BookTheme
  paper: PaperColor
  pageCount: number
  createdAt: string
  updatedAt: string
}

/** One page of a book, holding one or more photos. */
export interface BookPage {
  id: ID
  bookId: ID
  position: number
  layout: PageLayout
  caption: string | null
  photos: Photo[]
}

/** A book with all of its pages, as returned by `GET /books/:id`. */
export interface BookWithPages extends Book {
  pages: BookPage[]
  /** True when the signed-in user owns the book and may edit it. */
  canEdit: boolean
  owner: Pick<User, 'id' | 'name'>
}

/** One page as sent to `PUT /books/:id/pages`. */
export interface BookPageInput {
  layout: PageLayout
  caption?: string | null
  photoIds: ID[]
}
