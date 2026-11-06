import type { ID, Permission, UserRole } from './models'
import type { PageQuery } from './api'

/** Limits the API enforces that apps can check before sending anything. Open to everyone. */
export interface AppLimits {
  maxPhotoMb: number
  maxAvatarMb: number
  maxBookPages: number
  registrationOpen: boolean
}

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
  /** How many days count as new for `users.new`. */
  newUserDays: number
  recentUsers: AdminUser[]
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
  owner: { id: ID; name: string; email: string } | null
}

export type SettingType = 'number' | 'boolean' | 'select'

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
