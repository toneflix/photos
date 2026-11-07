import type { ID, Permission, UserRole } from './models'
import type { PageQuery } from './api'

/** Limits the API enforces that apps can check before sending anything. Open to everyone; signed in, they follow the account's plan. */
export interface AppLimits {
  maxPhotoMb: number
  maxAvatarMb: number
  maxBookPages: number
  registrationOpen: boolean
  /** The cover line books print when their maker has none of their own. */
  bookKicker: string
  /** The back cover name books print when their maker has none of their own. */
  bookImprint: string
}

/** Used when the API can't be reached; the API still enforces its own limits. */
export const DEFAULT_LIMITS: AppLimits = { maxPhotoMb: 25, maxAvatarMb: 10, maxBookPages: 500, registrationOpen: true, bookKicker: 'A Toneflix photo book', bookImprint: 'Toneflix Photos' }

/** An account as admins see it. */
export interface AdminUser {
  id: ID
  name: string
  email: string
  emailVerified: boolean
  avatarUrl: string | null
  role: UserRole
  suspended: boolean
  suspendedAt: string | null
  photoCount: number
  bookCount: number
  createdAt: string
}

export interface AdminUserQuery extends PageQuery {
  q?: string
  role?: UserRole
  status?: 'active' | 'suspended'
}

/** Counts on the admin overview. */
export interface AdminOverview {
  users: { total: number; new: number; suspended: number; staff: number }
  photos: { total: number; public: number; storageBytes: number }
  books: { total: number; public: number }
  spaces: { total: number; public: number }
  /** All-time views and downloads of everything. */
  engagement: { views: number; downloads: number }
  /** Views and downloads per day over the last 30 days. */
  daily: StatsDay[]
  /** The most viewed public photos. */
  topPhotos: ModerationItem[]
  /** How many days count as new for `users.new`. */
  newUserDays: number
  recentUsers: AdminUser[]
}

/** Views and downloads on one day (YYYY-MM-DD). */
export interface StatsDay {
  date: string
  views: number
  downloads: number
}

/** An account for its admin page. */
export interface AdminUserDetail extends AdminUser {
  spaceCount: number
  publicPhotoCount: number
  publicBookCount: number
  showCounts: boolean
  /** The plan the account is on now, and when its paid time runs out. */
  plan: { slug: string; name: string; endsAt: string | null }
  totals: { views: number; downloads: number }
  daily: StatsDay[]
  topPhotos: ModerationItem[]
  topBooks: ModerationItem[]
}

export type ModeratedKind = 'photos' | 'books' | 'spaces'

/** A public photo, book or space under review. */
export interface ModerationItem {
  id: ID
  kind: 'photo' | 'book' | 'space'
  title: string
  imageUrl: string | null
  visibility: string
  publishedAt: string | null
  viewCount: number
  /** Null for spaces, which have nothing to download. */
  downloadCount: number | null
  owner: { id: ID; name: string; email: string } | null
}

/** A public item for its admin page. */
export interface ModerationItemDetail extends ModerationItem {
  details: { label: string; value: string }[]
  daily: StatsDay[]
  createdAt: string
}

export type ModerationSort = 'latest' | 'views' | 'downloads'

export type SettingType = 'number' | 'boolean' | 'select' | 'text'

/** One app setting admins can change. Until it is saved, `value` is the `.env` default. */
export interface SettingField {
  name: string
  /** The env variable its default comes from. */
  env: string | null
  type: SettingType
  label: string
  help: string | null
  unit: string | null
  min: number | null
  max: number | null
  options: { value: string; label: string }[] | null
  value: number | boolean | string
  default: number | boolean | string
  /** Whether an admin saved a value that overrides the default. */
  saved: boolean
}

/** Settings shown together on one form. */
export interface SettingGroup {
  id: string
  title: string
  description: string
  /** An icon name for the group's list entry. */
  icon: string
  fields: SettingField[]
}

/** A named collection of permissions accounts are given. */
export interface Role {
  id: ID
  slug: UserRole
  name: string
  description: string | null
  permissions: Permission[]
  /** Built-in roles (members and admins) can't be changed or deleted. */
  system: boolean
  userCount: number
  createdAt: string
  updatedAt: string
}

/** A permission there is to choose from when making a role. */
export interface PermissionDefinition {
  name: Permission
  label: string
  description: string
}

export interface RoleInput {
  name: string
  slug?: string | null
  description?: string | null
  permissions: Permission[]
}
