export type UserRole = 'user' | 'moderator' | 'admin'

/** Admin areas a role can open. */
export type AdminPermission = 'dashboard' | 'moderation' | 'users' | 'settings'

/**
 * What each role may do in the admin dashboard. Members have no admin access,
 * moderators can see the overview and take content off Explore, admins can do everything.
 */
export class Role {
  static readonly NAMES: UserRole[] = ['user', 'moderator', 'admin']

  static readonly GRANTS: Record<UserRole, AdminPermission[]> = {
    user: [],
    moderator: ['dashboard', 'moderation'],
    admin: ['dashboard', 'moderation', 'users', 'settings'],
  }

  constructor(readonly name: UserRole) {}

  permissions(): AdminPermission[] {
    return Role.GRANTS[this.name] ?? []
  }

  allows(permission: AdminPermission): boolean {
    return this.permissions().includes(permission)
  }
}
