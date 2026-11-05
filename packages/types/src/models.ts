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
  /** The space the photo sits in, if any. */
  spaceId: ID | null
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
  /** Public photos show on Explore. */
  visibility: PhotoVisibility
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export type PhotoVisibility = 'private' | 'public'

/** Who made a public photo or book. All null when they keep their name off shared work. */
export interface Owner {
  id: ID | null
  name: string | null
  avatarUrl: string | null
}

/** A link to the public space a photo or book sits in. Null outside a space or in a private one. */
export interface SpaceLink {
  id: ID
  name: string
  slug: string
}

/** A photo on Explore. */
export interface PublicPhoto extends Photo {
  owner: Owner
  space: SpaceLink | null
}

/** A public photo with the owner's public books it appears in, and the page it is first on. */
export interface PublicPhotoDetail extends PublicPhoto {
  books: { id: ID; title: string; theme: BookTheme; page: number }[]
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
  /** The space the book sits in, if any. */
  spaceId: ID | null
  title: string
  description: string | null
  coverPhotoId: ID | null
  coverPhoto?: Photo | null
  visibility: Visibility
  theme: BookTheme
  paper: PaperColor
  pageCount: number
  /** When the book last became public. */
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

/** A book on Explore. */
export interface PublicBook extends Book {
  owner: Owner
  space: SpaceLink | null
}

/**
 * Who can browse a space.
 * - private: only the owner. Its photos and books stay off Explore.
 * - public: anyone, on its own page and on Explore.
 */
export type SpaceVisibility = 'private' | 'public'

/**
 * A creator's collection of photos and books, like an organisation. A creator
 * can have many. Owners see every photo and book in counts and previews.
 */
export interface Space {
  id: ID
  userId: ID
  name: string
  /** The space's web address, e.g. `ada-weddings`. */
  slug: string
  description: string | null
  visibility: SpaceVisibility
  publishedAt: string | null
  photoCount: number
  bookCount: number
  /** Up to four of the newest photos, for the space's card. */
  previews: Photo[]
  createdAt: string
  updatedAt: string
}

/** A space as visitors see it: counts and previews include only public photos and books. */
export interface PublicSpace extends Space {
  owner: Owner
  /** True when the signed-in viewer owns the space. */
  canEdit: boolean
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

/**
 * What someone may do with a book.
 * - view: open and read it. Every access code has this.
 * - add: upload photos onto new pages.
 * - edit: change pages, captions, title and cover.
 * - transfer: claim the book as their own.
 */
export type BookPermission = 'view' | 'add' | 'edit' | 'transfer'

export const BOOK_PERMISSIONS: Record<BookPermission, { label: string; description: string }> = {
  view: { label: 'View', description: 'Open and read the book' },
  add: { label: 'Add', description: 'Upload photos onto new pages' },
  edit: { label: 'Edit', description: 'Change pages, captions, title and cover' },
  transfer: { label: 'Transfer', description: 'Claim the book as their own' },
}

/** A book with all of its pages, as returned by `GET /books/:id`. */
export interface BookWithPages extends Book {
  pages: BookPage[]
  /** True when the visitor may edit the book, as its owner or with an access code. */
  canEdit: boolean
  isOwner: boolean
  /** Everything the visitor may do with the book. */
  permissions: BookPermission[]
  owner: Pick<User, 'id' | 'name'>
}

/** A code that unlocks a book, as its owner manages it. */
export interface BookAccessCode {
  id: ID
  bookId: ID
  /** Like `K7QM-4XTP`. Case and the dash don't matter when typed. */
  code: string
  label: string | null
  permissions: BookPermission[]
  /** How many times the code was used to open the book. */
  uses: number
  lastUsedAt: string | null
  expiresAt: string | null
  expired: boolean
  /** Link that opens the book with this code filled in. */
  shareUrl: string
  createdAt: string
  updatedAt: string
}

/** The book an access code opens, as returned by `POST /access-codes/redeem`. */
export interface BookAccessGrant {
  code: string
  permissions: BookPermission[]
  book: Book
}

export interface BookAccessCodeInput {
  label?: string | null
  permissions?: BookPermission[]
  expiresAt?: string | null
}

/** One page as sent to `PUT /books/:id/pages`. */
export interface BookPageInput {
  layout: PageLayout
  caption?: string | null
  photoIds: ID[]
}
