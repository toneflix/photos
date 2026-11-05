import type { BookTheme } from './models'

/**
 * Response envelopes produced by the API (resora, see apps/api/src/config/resources.ts).
 */
export interface ApiResponse<T> {
  data: T
  status: 'success' | 'error'
  message: string
  code: number
}

export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
  path: string
  links?: PaginationLinks
}

export interface PaginationLinks {
  first: string | null
  last: string | null
  prev: string | null
  next: string | null
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta
  links: PaginationLinks
}

export interface ApiError {
  status: 'error'
  message: string
  code: number
  errors?: Record<string, string[]>
}

export interface PageQuery {
  page?: number
  per_page?: number
}

export type PhotoOrientation = 'landscape' | 'portrait' | 'square'
export type ListSort = 'latest' | 'oldest'

/**
 * Search and filters for photo lists. `visibility` applies to your own library only.
 * `space` is a space id in your library and a space's web address (slug) on Explore.
 */
export interface PhotoQuery extends PageQuery {
  q?: string
  orientation?: PhotoOrientation
  visibility?: 'private' | 'public'
  sort?: ListSort
  space?: string
}

/**
 * Search and filters for book lists. `visibility` applies to your own books only.
 * `space` is a space id in your library and a space's web address (slug) on Explore.
 */
export interface BookQuery extends PageQuery {
  q?: string
  theme?: BookTheme
  visibility?: 'private' | 'shared' | 'public'
  sort?: ListSort
  space?: string
}

/** Search for public spaces on Explore. */
export interface SpaceQuery extends PageQuery {
  q?: string
  sort?: ListSort
}
