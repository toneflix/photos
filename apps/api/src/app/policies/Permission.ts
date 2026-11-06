export type PermissionName = 'dashboard.view' | 'users.view' | 'users.manage' | 'content.moderate' | 'settings.manage' | 'roles.manage'

export interface PermissionDefinition {
  name: PermissionName
  label: string
  description: string
}

/**
 * Everything a role can be allowed to do in the admin dashboard. Roles are collections
 * of these; the code checks them by name, so new ones are added here.
 */
export class Permission {
  static readonly ALL: PermissionDefinition[] = [
    { name: 'dashboard.view', label: 'Open the dashboard', description: 'See the admin dashboard and its overview.' },
    { name: 'users.view', label: 'See accounts', description: 'Search accounts and see what they hold.' },
    { name: 'users.manage', label: 'Manage accounts', description: 'Give accounts a role, suspend them and let them back in.' },
    { name: 'content.moderate', label: 'Moderate content', description: 'Take public photos, books and spaces off Explore.' },
    { name: 'settings.manage', label: 'Change settings', description: 'Change upload limits and other app settings.' },
    { name: 'roles.manage', label: 'Manage roles', description: 'Create roles and choose what each one allows.' },
  ]

  static names(): PermissionName[] {
    return Permission.ALL.map((permission) => permission.name)
  }
}
