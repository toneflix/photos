import { abortIf } from '@arkstack/common'
import { Space } from '@app/models/Space'
import { SpaceMember, type SpacePermission } from '@app/models/SpaceMember'
import type { User } from '@app/models/User'

/**
 * What one visitor may do in one space. Owners may do everything; anyone may open
 * a public space; everything else comes from the membership the owner gave them.
 */
export class SpaceAccess {
  constructor(
    readonly space: Space,
    readonly viewer: User | null,
    readonly membership: SpaceMember | null = null,
  ) {}

  /** The viewer's access to `space`, looking up their membership if they have one. */
  static async resolve(space: Space, viewer: User | null): Promise<SpaceAccess> {
    const membership = viewer && !space.isOwnedBy(viewer) ? await viewer.spaceMemberships().where({ spaceId: space.id }).first() : null

    return new SpaceAccess(space, viewer, membership)
  }

  /** The space with `id` and the viewer's access to it. */
  static async find(id: string, viewer: User | null): Promise<SpaceAccess> {
    const space = await Space.query().findOrFail(id)

    return SpaceAccess.resolve(space, viewer)
  }

  /** The space at `slug`, with its owner loaded, when the viewer may open it; a 404 otherwise. */
  static async browse(slug: string, viewer: User | null): Promise<SpaceAccess> {
    const space = await Space.query()
      .where({ slug })
      .with('user')
      .first()

    abortIf(!space, 'Space not found!', 404)

    return (await SpaceAccess.resolve(space!, viewer)).authorize('view')
  }

  get isOwner(): boolean {
    return this.space.isOwnedBy(this.viewer)
  }

  get isMember(): boolean {
    return !!this.membership
  }

  can(permission: SpacePermission): boolean {
    if (this.isOwner) return true
    if (permission === 'view' && this.space.visibility === 'public') return true

    return !!this.membership?.allows(permission)
  }

  /** Every permission this visitor has, for clients to show the right controls. */
  permissions(): SpacePermission[] {
    return SpaceMember.PERMISSIONS.filter((permission) => this.can(permission))
  }

  /** Stop unless the visitor may do this. Spaces they can't open look missing. */
  authorize(permission: SpacePermission): this {
    abortIf(!this.can('view'), 'Space not found!', 404)
    abortIf(!this.can(permission), 'You don’t have permission to do that in this space.', 403)

    return this
  }

  /** Stop unless the visitor owns the space. */
  authorizeOwner(message = 'Only the space owner can do that.'): this {
    abortIf(!this.can('view'), 'Space not found!', 404)
    abortIf(!this.isOwner, message, 403)

    return this
  }

  /**
   * Whether the visitor may change or remove `member`. Managers run the other members;
   * only the owner can change a manager or hand out `manage`.
   */
  mayChange(member: SpaceMember, permissions: SpacePermission[] = []): boolean {
    if (this.isOwner) return true
    if (!this.can('manage')) return false

    return !member.allows('manage') && !permissions.includes('manage')
  }
}
