/**
 * Core domain models. These are first drafts for the scaffold and will be
 * finalised against the product specs while building the API.
 */

export type ID = number

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

/** A photo book: an ordered collection of photos laid out on pages. */
export interface Book {
  id: ID
  userId: ID
  title: string
  description: string | null
  coverPhotoId: ID | null
  coverPhoto?: Photo | null
  visibility: Visibility
  pageCount: number
  createdAt: string
  updatedAt: string
}

/** One page of a book, holding one or more photos. */
export interface BookPage {
  id: ID
  bookId: ID
  position: number
  layout: string
  photos: Photo[]
}
