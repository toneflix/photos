import { abortIf, perPage } from '@arkstack/common'
import { AccountMail } from '@app/notifications/AccountMail'
import { BaseController } from './BaseController'
import { Limits } from '@app/policies/Limits'
import { SpaceAccess } from '@app/policies/SpaceAccess'
import { SpaceMember } from '@app/models/SpaceMember'
import { SpaceMemberCollection } from '@app/http/resources/SpaceMemberCollection'
import { SpaceMemberResource } from '@app/http/resources/SpaceMemberResource'
import { User } from '@app/models/User'

const PERMISSIONS = {
  permissions: 'nullable|array',
  'permissions.*': `in:${SpaceMember.PERMISSIONS.join(',')}`,
}

/**
 * The people invited into a space. Owners and members with `manage` invite, change and
 * remove them; any member can leave.
 */
export default class SpaceMemberController extends BaseController {
  async index() {
    const access = (await this.access()).authorize('manage')
    const members = await access.space
      .members()
      .with('user')
      .latest('createdAt')
      .paginate(perPage(this.query, { perPage: 50, maxPerPage: 100 }))

    return new SpaceMemberCollection(members).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** Invite someone by email. They join once they accept from the account with that address. */
  async create() {
    const access = (await this.access()).authorize('manage')
    const space = access.space

    this.body.email = User.normalizeEmail(this.body.email)

    const data = await this.validate({ email: 'required|email|max:191', ...PERMISSIONS })
    const owner = await space.user().firstOrFail()

    abortIf((data.permissions ?? []).includes('manage') && !access.isOwner, 'Only the space owner can let others manage it.', 403)

    await (await Limits.for(owner)).ensureCanInvite(space)

    const member = await SpaceMember.invite(space, this.user, data.email, data.permissions)

    await AccountMail.spaceInvite(member.email, this.user, space).catch((error) => console.error('Space invite email failed', error))

    return new SpaceMemberResource(member)
      .additional({ status: 'success', message: 'Invite sent', code: 201 })
      .response()
      .setStatusCode(201)
  }

  async update() {
    const access = (await this.access()).authorize('manage')
    const member = await this.member(access)
    const data = await this.validate({ permissions: 'required|array', 'permissions.*': PERMISSIONS['permissions.*'] })

    abortIf(!access.mayChange(member, data.permissions), 'Only the space owner can change who manages it.', 403)

    member.revise(data.permissions)
    await member.save()

    return new SpaceMemberResource(member).additional({ status: 'success', message: 'Member updated', code: 200 })
  }

  /** Remove a member or cancel an invite, or leave the space when the member is you. Their photos and books leave with them. */
  async destroy() {
    const access = await this.access()
    const member = await this.member(access)
    const leaving = !!member.userId && member.userId === this.user.id

    if (!leaving) {
      access.authorize('manage')
      abortIf(!access.mayChange(member), 'Only the space owner can remove someone who manages it.', 403)
    }

    await member.remove()

    return new SpaceMemberResource(member).additional({ status: 'success', message: leaving ? 'You left the space' : 'Member removed', code: 200 })
  }

  private async access(): Promise<SpaceAccess> {
    return SpaceAccess.find(String(this.params.space), this.user)
  }

  private async member(access: SpaceAccess): Promise<SpaceMember> {
    return access.space
      .members()
      .with('user')
      .findOrFail(String(this.params.member))
  }
}
