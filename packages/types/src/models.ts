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
  createdAt: string
  updatedAt: string
}

export interface AuthToken {
  token: string
  expiresAt: string | null
}

/** A single uploaded photo. The file itself lives on the API's storage disk. */
export interface Photo {
  id: ID
  userId: ID
  url: string
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
 */
export type PageLayout = 'single' | 'framed' | 'pair' | 'grid'

export const PAGE_LAYOUTS: Record<PageLayout, { label: string; maxPhotos: number }> = {
  single: { label: 'Full bleed', maxPhotos: 1 },
  framed: { label: 'Framed', maxPhotos: 1 },
  pair: { label: 'Pair', maxPhotos: 2 },
  grid: { label: 'Grid', maxPhotos: 4 },
}

/** The look of a book's cover and paper. */
export type BookTheme = 'classic' | 'linen' | 'midnight'

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
