import { createAlova, type StatesHook } from 'alova'
import adapterFetch from 'alova/fetch'
import type { ApiError } from '@photos/types'

export interface PhotosClientOptions {
  /** Base URL of the API, e.g. https://api.photos.toneflix.net/api */
  baseURL: string
  /**
   * Returns the current access token, if any. Called before every request so
   * web (cookie/session) and mobile (secure storage) can each supply their own.
   */
  getToken?: () => string | null | undefined | Promise<string | null | undefined>
  /** Called when the API answers 401, e.g. to clear the session and go to sign-in. */
  onUnauthorized?: () => void
  /**
   * The UI states hook (`ReactHook` from `alova/react` for both web and mobile).
   * Leave it out on the server, where only `.send()` is used.
   */
  statesHook?: StatesHook<any>
  /**
   * Response cache. Turn it off (`null`) for clients used during SSR, so cached
   * data can never leak between users sharing a Worker isolate.
   */
  cacheFor?: null | { GET?: number }
  /** Custom fetch, e.g. to forward cookies during SSR. */
  fetch?: typeof fetch
  /** Extra headers on every request, e.g. the visitor's user agent and IP when calling from SSR. */
  headers?: Record<string, string>
  timeout?: number
}

export class PhotosApiError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly errors?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'PhotosApiError'
  }
}

export function createPhotosAlova(options: PhotosClientOptions) {
  return createAlova({
    baseURL: options.baseURL,
    statesHook: options.statesHook,
    requestAdapter: adapterFetch(options.fetch ? { customFetch: options.fetch } : undefined),
    timeout: options.timeout ?? 30_000,
    cacheFor: options.cacheFor === undefined ? { GET: 60_000 } : options.cacheFor,

    async beforeRequest(method) {
      method.config.headers = {
        Accept: 'application/json',
        ...options.headers,
        ...method.config.headers,
      }

      const token = await options.getToken?.()
      if (token) {
        method.config.headers.Authorization = `Bearer ${token}`
      }
    },

    responded: {
      async onSuccess(response) {
        const body = response.status === 204 ? null : await response.json().catch(() => null)

        if (!response.ok) {
          if (response.status === 401) options.onUnauthorized?.()

          const err = (body ?? {}) as Partial<ApiError>
          throw new PhotosApiError(response.status, err.message ?? response.statusText, err.errors)
        }

        return body
      },
    },
  })
}

export type PhotosAlova = ReturnType<typeof createPhotosAlova>
