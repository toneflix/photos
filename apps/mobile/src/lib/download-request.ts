import type { PhotoDownloadPreset } from '@photos/types'
import { apiUrl } from './links'
import { session } from './session'

/** A preset size, or a custom width with an optional height (both set crops from the centre). */
export type DownloadSize = { size: PhotoDownloadPreset } | { width: number; height?: number }

type RequestClass<T> = new (path: string, headers?: Record<string, string>) => T

/** Where a download comes from on the API and the headers it needs. */
export class DownloadRequest {
  constructor(
    protected readonly path: string,
    protected readonly headers: Record<string, string> = {},
  ) {}

  /** One photo at a size: the owner's own route, or the public one for an openly licensed photo. */
  static photo<T extends DownloadRequest>(this: RequestClass<T>, id: string, size: DownloadSize, owned: boolean): T {
    const query = 'size' in size ? (size.size === 'original' ? '' : `?size=${size.size}`) : `?width=${size.width}${size.height ? `&height=${size.height}` : ''}`

    return new this(`${owned ? '/photos' : '/explore/photos'}/${encodeURIComponent(id)}/download${query}`, DownloadRequest.auth())
  }

  /** A zip of a book's photos, as the viewer's sign-in and access code allow. */
  static book<T extends DownloadRequest>(this: RequestClass<T>, id: string, code?: string | null): T {
    return new this(`/books/${encodeURIComponent(id)}/download`, { ...DownloadRequest.auth(), ...(code ? { 'X-Access-Code': code } : {}) })
  }

  /** A book's designed pages for its owner: one print-ready PDF, or a zip of page images. */
  static bookPages<T extends DownloadRequest>(this: RequestClass<T>, id: string, format: 'pdf' | 'images'): T {
    return new this(`/books/${encodeURIComponent(id)}/pages/download?format=${format}`, DownloadRequest.auth())
  }

  private static auth(): Record<string, string> {
    const token = session.getToken()

    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  protected get url() {
    return apiUrl(this.path)
  }

  /** The API's reason a download failed. */
  protected async problem(failed?: Response) {
    const response = failed ?? (await fetch(this.url, { headers: this.headers }).catch(() => null))
    const body = await response?.json().catch(() => null)

    return typeof body?.message === 'string' ? body.message : "We couldn't download it. Try again in a minute."
  }
}
