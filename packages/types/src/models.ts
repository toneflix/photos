import type { CoverDesign, CoverTheme, FrameStyle, PageLayout, PaperColor, PhotoPosition } from '@toneflix/flipbook-core'

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

/** The slug of an account's role. `user` (members) and `admin` are built in; admins add others. */
export type UserRole = string

/** Something a role can be allowed to do in the admin dashboard. */
export type Permission = 'dashboard.view' | 'users.view' | 'users.manage' | 'content.moderate' | 'settings.manage' | 'roles.manage' | 'plans.manage' | 'pages.manage'

export interface User {
  id: ID
  name: string
  /** Lower case letters, numbers and underscores; the maker's profile lives at /makers/:username. */
  username: string
  email: string
  emailVerified: boolean
  /** Signed URL, generated per response. */
  avatarUrl: string | null
  /** Visibility given to new books. */
  defaultVisibility: Visibility
  /** Whether people opening a shared or public book see the owner's name. */
  showOwnerName: boolean
  /** Whether visitors see view and download counts on this account's public work. */
  showCounts: boolean
  /** Licence given to new uploads. */
  defaultLicense: PhotoLicense
  role: UserRole
  /** What this account's role allows in the admin dashboard; empty for members. */
  permissions: Permission[]
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
  /** Signed URL of the WebP display copy (or the original when there is none), generated per response. */
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
  license: PhotoLicense
  /** The original's size first, then each smaller preset it can be downloaded at. */
  downloads: PhotoDownloadSize[]
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

/** A preset download size: `original`, `large`, `medium` or `small`. */
export type PhotoDownloadPreset = 'original' | 'large' | 'medium' | 'small'

/** One size a photo can be downloaded at. */
export interface PhotoDownloadSize {
  size: PhotoDownloadPreset
  width: number
  height: number
}

export type PhotoVisibility = 'private' | 'public'

/** How others may use a public photo. Only open licences can be downloaded. */
export type PhotoLicense = 'all-rights-reserved' | 'cc-by' | 'cc-by-nc' | 'cc0'

/** Who made a public photo or book. All null when they keep their name off shared work. */
export interface Owner {
  id: ID | null
  username: string | null
  name: string | null
  avatarUrl: string | null
}

/** A maker's public profile. Only makers who show their name on shared work have one; makers can always open their own. */
export interface Profile {
  id: ID
  name: string
  username: string
  avatarUrl: string | null
  joinedAt: string
  /** Public photos, books and spaces everyone can browse. */
  photoCount: number
  bookCount: number
  spaceCount: number
  /** Views and downloads of that work, when the maker shows counts or is the viewer. */
  stats: { views: number; downloads: number } | null
  /** True when the signed-in viewer is this maker. */
  isOwner: boolean
  /** False while the maker keeps their name off shared work, so only they can open the profile. */
  isListed: boolean
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
  /** Shown to the owner always, and to others when the owner chose to show counts. */
  stats: ContentCounts | null
}

/** How often something was viewed and downloaded. Spaces have no downloads. */
export interface ContentCounts {
  views: number
  downloads: number | null
}

/** The cloth of a book's cover. */
export type BookTheme = CoverTheme

/** A photobook: an ordered collection of photos laid out on pages. */
export interface Book {
  id: ID
  userId: ID
  /** Who made the book. Its stats and branding stay theirs after a client claims it. */
  creatorId: ID | null
  /** The space the book sits in, if any. */
  spaceId: ID | null
  title: string
  description: string | null
  coverPhotoId: ID | null
  coverPhoto?: Photo | null
  /** Which part of the cover photo shows, or null when it is centred. */
  coverPosition: PhotoPosition | null
  visibility: Visibility
  theme: BookTheme
  /** How the front cover is laid out. */
  coverDesign: CoverDesign
  /** Print the title on the cover, or null for the design's default (on, except for `image`). */
  coverText: boolean | null
  paper: PaperColor
  /** How photos are set on pages that don't choose their own frame. */
  frame: FrameStyle
  /** What the book prints on its covers, after the plan of the person who made it. It stays when a client claims the book. */
  branding: BookBranding
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
 * - private: only the owner and the members they invite. Its photos and books stay off Explore.
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
  stats: ContentCounts | null
  /** True when the signed-in viewer owns the space. */
  canEdit: boolean
  /** What the signed-in viewer may do in the space. Owners have every permission. */
  permissions: SpacePermission[]
}

/**
 * What a space member may do. Every member can view.
 * - view: open the space and its public photos and books, even while the space is private.
 * - create: add their own photos and books to the space.
 * - edit: change the pages of every book in the space and add photos to them.
 * - manage: rename the space and invite, change or remove members. Only the owner hands this out.
 */
export type SpacePermission = 'view' | 'create' | 'edit' | 'manage'

/** A space the signed-in user joined, with their membership. */
export interface SharedSpace extends PublicSpace {
  membershipId: ID
  joinedAt: string
}

/** Someone invited into a space, as its managers see them. `name` and `avatarUrl` appear once they join. */
export interface SpaceMember {
  id: ID
  spaceId: ID
  email: string
  name: string | null
  avatarUrl: string | null
  permissions: SpacePermission[]
  status: 'invited' | 'joined'
  invitedAt: string
  acceptedAt: string | null
}

/** An invite into someone's space, as the invited person sees it. */
export interface SpaceInvite {
  id: ID
  permissions: SpacePermission[]
  space: { id: ID; name: string; slug: string; description: string | null } | null
  invitedBy: { name: string; avatarUrl: string | null } | null
  invitedAt: string
}

/** One page of a book, holding one or more photos. */
export interface BookPage {
  id: ID
  bookId: ID
  position: number
  layout: PageLayout
  /** This page's frame, or null to use the book's. */
  frame: FrameStyle | null
  caption: string | null
  photos: BookPagePhoto[]
}

/** A photo as placed on a page. */
export interface BookPagePhoto extends Photo {
  /** This photo's frame, or null to use the page's. */
  frame: FrameStyle | null
  /** Which part of the photo shows in its slot, or null when it is centred. */
  position: PhotoPosition | null
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
  stats: ContentCounts | null
  /** True when the visitor may edit the book, as its owner or with an access code. */
  canEdit: boolean
  isOwner: boolean
  /** Everything the visitor may do with the book. */
  permissions: BookPermission[]
  owner: Pick<User, 'id' | 'name'>
  /** The saved branding text, shown only to the person who made the book. */
  customBranding?: BookBrandingInput
  /** Which branding fields the maker's plan lets them set. */
  brandingAllowed?: Record<keyof BookBrandingInput, boolean>
}

/** The cover line, brand and back cover a book prints. */
export interface BookBranding {
  kicker: string
  brand: string | null
  imprint: string
  colophon: string | null
}

/** Branding text the book's maker sets. Each field needs a plan that includes it; null prints the Toneflix default. */
export interface BookBrandingInput {
  kicker: string | null
  brand: string | null
  imprint: string | null
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
  frame?: FrameStyle | null
  caption?: string | null
  photoIds: ID[]
  /** Each photo's own frame, in `photoIds` order. Null uses the page's. */
  photoFrames?: (FrameStyle | null)[]
  /** Which part of each photo shows, in `photoIds` order. Null is centred. */
  photoPositions?: (PhotoPosition | null)[]
}
