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
