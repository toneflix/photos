import type {
  ApiResponse,
  Book,
  BookAccessCode,
  BookAccessCodeInput,
  BookAccessGrant,
  BookPageInput,
  BookTheme,
  BookWithPages,
  PaperColor,
  ID,
  BookQuery,
  PhotoQuery,
  PaginatedResponse,
  Photo,
  PhotoVisibility,
  PublicBook,
  PublicPhoto,
  PublicPhotoDetail,
  Session,
  SignedIn,
  TwoFactorChallenge,
  TwoFactorSetup,
  TwoFactorStatus,
  User,
  Visibility,
} from '@photos/types'
import type { PhotosAlova } from './client'

/**
 * Typed request methods for every API endpoint. Each call returns an alova
 * Method: `await` it (or call `.send()`) on the server, or pass it to
 * `useRequest` / `usePagination` in the apps.
 *
 * Routes match apps/api/src/routes/api.ts.
 */
export function createEndpoints(alova: PhotosAlova) {
  /** Send a book's access code, when the visitor has one. */
  const withCode = (code?: string | null) => (code ? { headers: { 'X-Access-Code': code } } : {})

  return {
    auth: {
      /** Signs in, or asks for a two-factor code when the account has it on. */
      login: (data: { email: string; password: string }) =>
        alova.Post<ApiResponse<SignedIn | TwoFactorChallenge>>('/auth/login', data),
      /** Finish a two-factor sign-in with an authenticator `code` or a `recoveryCode`. */
      twoFactor: (data: { challengeToken: string; code?: string; recoveryCode?: string }) =>
        alova.Post<ApiResponse<SignedIn>>('/auth/two-factor', data),
      register: (data: { name: string; email: string; password: string }) =>
        alova.Post<ApiResponse<SignedIn>>('/auth/register', data),
      logout: () => alova.Post<ApiResponse<null>>('/auth/logout'),
      me: () => alova.Get<ApiResponse<User>>('/auth/me', { cacheFor: null }),
      forgotPassword: (data: { email: string }) => alova.Post<ApiResponse<{ email: string }>>('/auth/forgot-password', data),
      resetPassword: (data: { token: string; password: string; password_confirmation: string }) =>
        alova.Post<ApiResponse<User>>('/auth/reset-password', data),
      verifyEmail: (data: { token: string; email: string }) => alova.Post<ApiResponse<User>>('/auth/verify-email', data),
    },

    account: {
      updateProfile: (data: { name: string }) => alova.Put<ApiResponse<User>>('/account/profile', data),
      /** `file` is a File/Blob on web, or an RN `{ uri, name, type }` object. */
      updateAvatar: (file: Blob | { uri: string; name: string; type: string }) => {
        const form = new FormData()
        const name = (file as { name?: string }).name
        if (name) form.append('avatar', file as Blob, name)
        else form.append('avatar', file as Blob)
        return alova.Post<ApiResponse<User>>('/account/avatar', form)
      },
      removeAvatar: () => alova.Delete<ApiResponse<User>>('/account/avatar'),
      updateEmail: (data: { email: string; password: string }) => alova.Put<ApiResponse<User>>('/account/email', data),
      sendVerification: () => alova.Post<ApiResponse<User>>('/account/email/verification'),
      updatePassword: (data: { currentPassword: string; password: string; password_confirmation: string }) =>
        alova.Put<ApiResponse<User>>('/account/password', data),
      updatePrivacy: (data: { defaultVisibility?: Visibility; showOwnerName?: boolean }) =>
        alova.Put<ApiResponse<User>>('/account/privacy', data),
      /** Make every book private. */
      lockBooks: () => alova.Post<ApiResponse<{ updated: number }>>('/account/privacy/lock-books'),
      /** Delete the account and everything in it. */
      remove: (data: { password: string }) => alova.Delete<ApiResponse<{ deleted: true }>>('/account', data),
      /** Path of the zip download with every photo, book and account detail. Needs the bearer token. */
      exportPath: '/account/export',

      sessions: () => alova.Get<ApiResponse<Session[]>>('/account/sessions', { cacheFor: null }),
      revokeSession: (id: ID) => alova.Delete<ApiResponse<Session>>(`/account/sessions/${id}`),
      revokeOtherSessions: () => alova.Delete<ApiResponse<{ revoked: number }>>('/account/sessions'),

      twoFactor: () => alova.Get<ApiResponse<TwoFactorStatus>>('/account/two-factor', { cacheFor: null }),
      setupTwoFactor: () => alova.Post<ApiResponse<TwoFactorSetup>>('/account/two-factor/setup'),
      /** Confirm setup with a code from the app. Returns recovery codes, shown once. */
      enableTwoFactor: (data: { code: string }) =>
        alova.Post<ApiResponse<TwoFactorStatus & { recoveryCodes: string[] }>>('/account/two-factor', data),
      regenerateRecoveryCodes: () =>
        alova.Post<ApiResponse<TwoFactorStatus & { recoveryCodes: string[] }>>('/account/two-factor/recovery-codes'),
      disableTwoFactor: (data: { password: string }) => alova.Delete<ApiResponse<TwoFactorStatus>>('/account/two-factor', data),
    },

    photos: {
      list: (params: PhotoQuery = {}) => alova.Get<PaginatedResponse<Photo>>('/photos', { params }),
      get: (id: ID) => alova.Get<ApiResponse<Photo>>(`/photos/${id}`),
      /**
       * Upload one photo. `file` is a File/Blob on web, or an RN `{ uri, name, type }` object.
       * Send the pixel size when known so books can lay the photo out before it loads.
       */
      upload: (
        file: Blob | { uri: string; name: string; type: string },
        meta: { caption?: string; width?: number; height?: number; takenAt?: string } = {},
      ) => {
        const form = new FormData()
        const name = (file as { name?: string }).name
        if (name) form.append('photo', file as Blob, name)
        else form.append('photo', file as Blob)
        for (const [key, value] of Object.entries(meta)) {
          if (value !== undefined && value !== null && value !== '') form.append(key, String(value))
        }
        return alova.Post<ApiResponse<Photo>>('/photos', form)
      },
      update: (id: ID, data: Partial<Pick<Photo, 'caption' | 'takenAt'> & { visibility: PhotoVisibility }>) =>
        alova.Put<ApiResponse<Photo>>(`/photos/${id}`, data),
      remove: (id: ID) => alova.Delete<ApiResponse<null>>(`/photos/${id}`),
    },

    /** The public timeline. Works signed out. */
    explore: {
      photos: (params: Omit<PhotoQuery, 'visibility'> = {}) => alova.Get<PaginatedResponse<PublicPhoto>>('/explore/photos', { params }),
      photo: (id: ID) => alova.Get<ApiResponse<PublicPhotoDetail>>(`/explore/photos/${id}`),
      books: (params: Omit<BookQuery, 'visibility'> = {}) => alova.Get<PaginatedResponse<PublicBook>>('/explore/books', { params }),
    },

    books: {
      list: (params: BookQuery = {}) => alova.Get<PaginatedResponse<Book>>('/books', { params }),
      /** A book with every page. Works signed out for shared and public books, and for private ones with an access `code`. */
      get: (id: ID, code?: string | null) => alova.Get<ApiResponse<BookWithPages>>(`/books/${id}`, withCode(code)),
      create: (data: Pick<Book, 'title'> & Partial<Pick<Book, 'description' | 'visibility' | 'theme' | 'paper'>>) =>
        alova.Post<ApiResponse<Book>>('/books', data),
      update: (
        id: ID,
        data: Partial<Pick<Book, 'title' | 'description' | 'visibility' | 'coverPhotoId'> & { theme: BookTheme; paper: PaperColor }>,
        code?: string | null,
      ) => alova.Put<ApiResponse<BookWithPages>>(`/books/${id}`, data, withCode(code)),
      /** Replace every page of the book, in order. */
      savePages: (id: ID, pages: BookPageInput[], code?: string | null) =>
        alova.Put<ApiResponse<BookWithPages>>(`/books/${id}/pages`, { pages }, withCode(code)),
      /** Upload a photo onto a new last page. It joins the book owner's library. */
      addPhoto: (
        id: ID,
        file: Blob | { uri: string; name: string; type: string },
        meta: { caption?: string; width?: number; height?: number } = {},
        code?: string | null,
      ) => {
        const form = new FormData()
        const name = (file as { name?: string }).name
        if (name) form.append('photo', file as Blob, name)
        else form.append('photo', file as Blob)
        for (const [key, value] of Object.entries(meta)) {
          if (value !== undefined && value !== null && value !== '') form.append(key, String(value))
        }
        return alova.Post<ApiResponse<BookWithPages>>(`/books/${id}/photos`, form, withCode(code))
      },
      remove: (id: ID) => alova.Delete<ApiResponse<null>>(`/books/${id}`),

      /** Codes that unlock a book. Owner only. */
      accessCodes: (id: ID) => alova.Get<ApiResponse<BookAccessCode[]>>(`/books/${id}/access-codes`, { cacheFor: null }),
      createAccessCode: (id: ID, data: BookAccessCodeInput) => alova.Post<ApiResponse<BookAccessCode>>(`/books/${id}/access-codes`, data),
      updateAccessCode: (id: ID, codeId: ID, data: BookAccessCodeInput) =>
        alova.Put<ApiResponse<BookAccessCode>>(`/books/${id}/access-codes/${codeId}`, data),
      revokeAccessCode: (id: ID, codeId: ID) => alova.Delete<ApiResponse<BookAccessCode>>(`/books/${id}/access-codes/${codeId}`),
    },

    accessCodes: {
      /** Find the book a code opens. Works signed out, and counts as a visit. */
      redeem: (code: string) => alova.Post<ApiResponse<BookAccessGrant>>('/access-codes/redeem', { code }),
      /** Take ownership of a book with a code that allows `transfer`. */
      claim: (code: string) => alova.Post<ApiResponse<BookWithPages>>('/access-codes/claim', { code }),
    },
  }
}

export type PhotosEndpoints = ReturnType<typeof createEndpoints>
