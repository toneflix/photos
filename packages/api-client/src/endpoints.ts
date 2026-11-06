import type {
  AccountPlan,
  AdminOverview,
  AdminUser,
  AdminUserDetail,
  AdminUserQuery,
  ApiResponse,
  AppLimits,
  Book,
  BookAccessCode,
  BookAccessCodeInput,
  BookAccessGrant,
  BookBrandingInput,
  BookPageInput,
  BookWithPages,
  ID,
  MakerItemStats,
  MakerStats,
  ModeratedKind,
  ModerationItem,
  ModerationItemDetail,
  ModerationSort,
  BookQuery,
  PhotoQuery,
  Plan,
  PageQuery,
  PaginatedResponse,
  PermissionDefinition,
  Photo,
  PhotoLicense,
  PhotoVisibility,
  PublicBook,
  PublicPhoto,
  PublicPhotoDetail,
  PublicSpace,
  Role,
  RoleInput,
  Session,
  SettingGroup,
  SignedIn,
  Space,
  SpaceQuery,
  SpaceVisibility,
  TwoFactorChallenge,
  TwoFactorSetup,
  TwoFactorStatus,
  User,
  UserRole,
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
    /** Upload sizes and other limits to check before sending anything. Works signed out. */
    limits: () => alova.Get<ApiResponse<AppLimits>>('/limits', { cacheFor: null }),

    /** Plans on offer, cheapest first. Works signed out. */
    plans: () => alova.Get<ApiResponse<Plan[]>>('/plans', { cacheFor: null }),

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
      plan: () => alova.Get<ApiResponse<AccountPlan>>('/account/plan', { cacheFor: null }),
      /** Views and downloads of everything the account owns, charted over `days`. */
      stats: (days?: number) => alova.Get<ApiResponse<MakerStats>>('/account/stats', { params: { days }, cacheFor: null }),
      /** One of the account's own photos, books or spaces with its daily views and downloads. */
      itemStats: (kind: ModeratedKind, id: ID, days?: number) =>
        alova.Get<ApiResponse<MakerItemStats>>(`/account/stats/${kind}/${id}`, { params: { days }, cacheFor: null }),
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
      updatePrivacy: (data: { defaultVisibility?: Visibility; showOwnerName?: boolean; showCounts?: boolean; defaultLicense?: PhotoLicense }) =>
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
        meta: { caption?: string; width?: number; height?: number; takenAt?: string; spaceId?: ID; license?: PhotoLicense } = {},
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
      update: (id: ID, data: Partial<Pick<Photo, 'caption' | 'takenAt' | 'spaceId'> & { visibility: PhotoVisibility; license: PhotoLicense }>) =>
        alova.Put<ApiResponse<Photo>>(`/photos/${id}`, data),
      remove: (id: ID) => alova.Delete<ApiResponse<null>>(`/photos/${id}`),
    },

    /** The public timeline. Works signed out. */
    explore: {
      photos: (params: Omit<PhotoQuery, 'visibility'> = {}) => alova.Get<PaginatedResponse<PublicPhoto>>('/explore/photos', { params }),
      photo: (id: ID) => alova.Get<ApiResponse<PublicPhotoDetail>>(`/explore/photos/${id}`),
      books: (params: Omit<BookQuery, 'visibility'> = {}) => alova.Get<PaginatedResponse<PublicBook>>('/explore/books', { params }),
      spaces: (params: SpaceQuery = {}) => alova.Get<PaginatedResponse<PublicSpace>>('/explore/spaces', { params }),
      /** A space's page by its web address. Private spaces open only for their owner. */
      space: (slug: string) => alova.Get<ApiResponse<PublicSpace>>(`/explore/spaces/${encodeURIComponent(slug)}`, { cacheFor: null }),
    },

    /** Your spaces: collections of photos and books with their own page. */
    spaces: {
      list: (params: PageQuery = {}) => alova.Get<PaginatedResponse<Space>>('/spaces', { params, cacheFor: null }),
      get: (id: ID) => alova.Get<ApiResponse<Space>>(`/spaces/${id}`, { cacheFor: null }),
      create: (data: { name: string; slug?: string | null; description?: string | null; visibility?: SpaceVisibility }) =>
        alova.Post<ApiResponse<Space>>('/spaces', data),
      update: (id: ID, data: Partial<{ name: string; slug: string; description: string | null; visibility: SpaceVisibility }>) =>
        alova.Put<ApiResponse<Space>>(`/spaces/${id}`, data),
      /** Delete the space. Its photos and books stay in your library. */
      remove: (id: ID) => alova.Delete<ApiResponse<Space>>(`/spaces/${id}`),
    },

    books: {
      list: (params: BookQuery = {}) => alova.Get<PaginatedResponse<Book>>('/books', { params }),
      /** A book with every page. Works signed out for shared and public books, and for private ones with an access `code`. */
      get: (id: ID, code?: string | null) => alova.Get<ApiResponse<BookWithPages>>(`/books/${id}`, withCode(code)),
      create: (data: Pick<Book, 'title'> & Partial<Pick<Book, 'description' | 'visibility' | 'theme' | 'coverDesign' | 'coverText' | 'paper' | 'frame' | 'spaceId'>>) =>
        alova.Post<ApiResponse<Book>>('/books', data),
      update: (
        id: ID,
        data: Partial<Pick<Book, 'title' | 'description' | 'visibility' | 'coverPhotoId' | 'spaceId' | 'theme' | 'coverDesign' | 'coverText' | 'paper' | 'frame'> & BookBrandingInput>,
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

    /** The admin dashboard. Each area needs a role that grants it (see `User.permissions`). */
    admin: {
      overview: () => alova.Get<ApiResponse<AdminOverview>>('/admin/overview', { cacheFor: null }),
      users: (params: AdminUserQuery = {}) => alova.Get<PaginatedResponse<AdminUser>>('/admin/users', { params, cacheFor: null }),
      /** One account with views and downloads of its work per day over `days` (default 30). */
      user: (id: ID, days?: number) => alova.Get<ApiResponse<AdminUserDetail>>(`/admin/users/${id}`, { params: { days }, cacheFor: null }),
      /** Change an account's role, or suspend it (`suspended: true`) and let it back in. */
      updateUser: (id: ID, data: { role?: UserRole; suspended?: boolean }) => alova.Put<ApiResponse<AdminUser>>(`/admin/users/${id}`, data),
      moderation: (kind: ModeratedKind, params: PageQuery & { q?: string; sort?: ModerationSort } = {}) =>
        alova.Get<PaginatedResponse<ModerationItem>>(`/admin/moderation/${kind}`, { params, cacheFor: null }),
      /** One public photo, book or space with views and downloads per day over `days` (default 30). */
      moderationItem: (kind: ModeratedKind, id: ID, days?: number) =>
        alova.Get<ApiResponse<ModerationItemDetail>>(`/admin/moderation/${kind}/${id}`, { params: { days }, cacheFor: null }),
      /** Take a public photo, book or space off Explore. It becomes private for its owner. */
      unpublish: (kind: ModeratedKind, id: ID) => alova.Post<ApiResponse<ModerationItem>>(`/admin/moderation/${kind}/${id}/unpublish`),
      /** Every role, with the permissions there are to choose from. */
      roles: () => alova.Get<ApiResponse<Role[]> & { permissions: PermissionDefinition[] }>('/admin/roles', { cacheFor: null }),
      createRole: (data: RoleInput) => alova.Post<ApiResponse<Role>>('/admin/roles', data),
      updateRole: (id: ID, data: Partial<RoleInput>) => alova.Put<ApiResponse<Role>>(`/admin/roles/${id}`, data),
      /** Refused for built-in roles and roles someone still has. */
      removeRole: (id: ID) => alova.Delete<ApiResponse<Role>>(`/admin/roles/${id}`),
      settings: () => alova.Get<ApiResponse<SettingGroup[]>>('/admin/settings', { cacheFor: null }),
      /** Save a group's fields by name. Null puts a field back to its .env default. */
      updateSettings: (group: string, values: Record<string, number | boolean | string | null>) =>
        alova.Put<ApiResponse<SettingGroup>>(`/admin/settings/${group}`, values),
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
