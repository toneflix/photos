import { Model } from '@arkstack/database'
import { Space } from './Space'
import { User } from './User'
import { ValidationException } from 'kanun'
import type { QueryBuilder } from 'arkormx'

export type SpacePermission = 'view' | 'create' | 'edit' | 'manage'

/**
 * Someone invited into a space by email. The row is an invite until the person with
 * that address accepts it, then it is their membership. Every member can open the space;
 * the other permissions let them add their own work, edit its books, or run its members.
 */
export class SpaceMember extends Model {
  declare id: string
  declare spaceId: string
  declare userId: string | null
  declare invitedById: string | null
  declare email: string
  declare permissions: SpacePermission[]
  declare acceptedAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date

  static readonly PERMISSIONS: SpacePermission[] = ['view', 'create', 'edit', 'manage']

  protected static override table = 'space_members'

  protected static override columns = {
    spaceId: 'space_id',
    userId: 'user_id',
    invitedById: 'invited_by_id',
    acceptedAt: 'accepted_at',
  }

  protected override casts = {
    permissions: 'json',
  } as never

  space() {
    return this.belongsTo(Space, 'spaceId')
  }

  user() {
    return this.belongsTo(User, 'userId')
  }

  invitedBy() {
    return this.belongsTo(User, 'invitedById')
  }

  /** Every member can open the space, so `view` is always kept. */
  static permissionList(input?: SpacePermission[] | null): SpacePermission[] {
    const wanted = new Set<SpacePermission>(['view', ...(input ?? [])])

    return SpaceMember.PERMISSIONS.filter((permission) => wanted.has(permission))
  }

  /** Invite `email` into `space`. The owner and anyone already invited are refused with a field error. */
  static async invite(space: Space, inviter: User, email: string, permissions?: SpacePermission[] | null): Promise<SpaceMember> {
    const owner = await space.user().firstOrFail()
    const taken = await space
      .members()
      .where({ email })
      .exists()

    if (owner.email === email) throw ValidationException.withMessages({ email: 'This is the space owner’s address.' })
    if (taken) throw ValidationException.withMessages({ email: 'This person is already invited to the space.' })

    return space.members().create({
      email,
      invitedById: inviter.id,
      permissions: SpaceMember.permissionList(permissions),
    })
  }

  /** Members who accepted their invite. */
  scopeJoined(query: QueryBuilder<SpaceMember>): QueryBuilder<SpaceMember> {
    return query.whereNotNull('acceptedAt')
  }

  /** Invites still waiting for an answer. */
  scopePending(query: QueryBuilder<SpaceMember>): QueryBuilder<SpaceMember> {
    return query.whereNull('acceptedAt')
  }

  isPending(): boolean {
    return !this.acceptedAt
  }

  allows(permission: SpacePermission): boolean {
    return permission === 'view' || (this.permissions ?? []).includes(permission)
  }

  revise(permissions: SpacePermission[]): void {
    this.permissions = SpaceMember.permissionList(permissions)
  }

  async accept(user: User): Promise<void> {
    await this.update({ userId: user.id, acceptedAt: new Date() })
  }

  /** End the membership. The member's own photos and books leave the space and stay in their library. */
  async remove(): Promise<void> {
    const user = this.userId ? await this.user().first() : null

    await SpaceMember.transaction(async () => {
      if (user) {
        await (await user.photos().where({ spaceId: this.spaceId }).getQuery()).updateFrom({ spaceId: null })
        await (await user.books().where({ spaceId: this.spaceId }).getQuery()).updateFrom({ spaceId: null })
      }

      await this.delete()
    })
  }
}
