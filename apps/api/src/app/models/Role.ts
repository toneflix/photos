import { Permission, type PermissionName } from '@app/policies/Permission'
import { Cache } from '@arkstack/cache'
import { Model } from '@arkstack/database'
import { User } from './User'
import { abortIf } from '@arkstack/common'

export interface RoleDetails {
  name: string
  slug?: string | null
  description?: string | null
  permissions?: PermissionName[] | null
}

/**
 * A named collection of permissions that accounts are given. `user` (members) and
 * `admin` are built in: admins can always do everything, members nothing, and
 * neither can be changed or deleted. Admins add any other role they need.
 */
export class Role extends Model {
  declare id: string
  declare slug: string
  declare name: string
  declare description: string | null
  declare permissions: PermissionName[]
  declare isSystem: boolean
  declare createdAt: Date
  declare updatedAt: Date

  static readonly MEMBER = 'user'
  static readonly ADMIN = 'admin'

  static readonly CACHE_KEY = 'roles:all'

  /** Lowercase words joined by single dashes, e.g. `book-editor`. */
  static readonly SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

  protected static override table = 'roles'

  protected static override columns = {
    isSystem: 'is_system',
  }

  protected override casts = {
    permissions: 'json',
    isSystem: 'boolean',
  } as never

  users() {
    return User.query().where({ role: this.slug })
  }

  /** Every role's permissions by slug, cached until a role changes. */
  static async grants(): Promise<Record<string, PermissionName[]>> {
    return Cache.remember(Role.CACHE_KEY, 300, async () => {
      const roles = (await Role.query().get()).all()

      return Object.fromEntries(roles.map((role) => [role.slug, role.grantedPermissions()]))
    })
  }

  /** What an account with the role `slug` may do. Unknown roles allow nothing. */
  static async permissionsFor(slug: string | null | undefined): Promise<PermissionName[]> {
    return (await Role.grants())[slug ?? Role.MEMBER] ?? []
  }

  static async forget(): Promise<void> {
    await Cache.forget(Role.CACHE_KEY)
  }

  /** Make a role. Its slug comes from the name unless one is given. */
  static async open(details: RoleDetails): Promise<Role> {
    const role = await Role.query().create({
      slug: details.slug || (await Role.freeSlug(details.name)),
      name: details.name.trim(),
      description: details.description?.trim() || null,
      permissions: Role.known(details.permissions ?? []),
      isSystem: false,
    })

    await Role.forget()

    return role
  }

  /** A slug made from `name` that no other role uses yet. */
  static async freeSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 36) || 'role'

    let slug = base

    for (let n = 2; await Role.query().where({ slug }).exists(); n++) slug = `${base}-${n}`

    return slug
  }

  /** Only permissions the app knows, each once. */
  static known(permissions: string[]): PermissionName[] {
    return Permission.names().filter((name) => permissions.includes(name))
  }

  /** Admins hold every permission there is, including ones added later. */
  grantedPermissions(): PermissionName[] {
    return this.slug === Role.ADMIN ? Permission.names() : Role.known(this.permissions ?? [])
  }

  async revise(details: Partial<RoleDetails>): Promise<void> {
    abortIf(this.isSystem && details.permissions !== undefined, `The ${this.name} role is built in, so what it allows can't change.`, 422)

    if (details.name) this.name = details.name.trim()
    if (details.description !== undefined) this.description = details.description?.trim() || null
    if (details.permissions) this.permissions = Role.known(details.permissions)

    await this.save()
    await Role.forget()
  }

  /** Delete the role. Built-in roles and roles someone still has stay. */
  async remove(): Promise<void> {
    abortIf(this.isSystem, `The ${this.name} role is built in and can't be deleted.`, 422)

    const holders = await this.users().count()

    abortIf(holders > 0, `${holders} ${holders === 1 ? 'account has' : 'accounts have'} this role. Give them another role first.`, 422)

    await this.delete()
    await Role.forget()
  }
}
