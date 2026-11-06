import { abortIf, perPage } from '@arkstack/common'
import { BaseController } from './BaseController'
import { SharedSpaceCollection } from '@app/http/resources/SharedSpaceCollection'
import { SharedSpaceResource } from '@app/http/resources/SharedSpaceResource'
import { SpaceInviteCollection } from '@app/http/resources/SpaceInviteCollection'
import { SpaceInviteResource } from '@app/http/resources/SpaceInviteResource'
import type { SpaceMember } from '@app/models/SpaceMember'

/**
 * The signed-in user's side of space memberships: invites sent to their address,
 * and the spaces they joined.
 */
export default class SpaceInviteController extends BaseController {
  async index() {
    const invites = await this.user
      .spaceInvites()
      .with(['space', 'invitedBy'])
      .latest('createdAt')
      .paginate(perPage(this.query, { perPage: 50, maxPerPage: 100 }))

    return new SpaceInviteCollection(invites).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** Join the space. Only an account that confirmed the invited address can. */
  async accept() {
    const invite = await this.invite()

    abortIf(!this.user.hasVerifiedEmail(), 'Confirm your email address to join this space.', 403)

    await invite.accept(this.user)
    await invite.load(['space', 'space.user', 'user'])

    return new SharedSpaceResource(invite).additional({ status: 'success', message: 'You joined the space', code: 200 })
  }

  async decline() {
    const invite = await this.invite()

    await invite.load(['space', 'invitedBy'])
    await invite.delete()

    return new SpaceInviteResource(invite).additional({ status: 'success', message: 'Invite declined', code: 200 })
  }

  /** Spaces the user joined, most recent first. */
  async spaces() {
    const memberships = await this.user
      .spaceMemberships()
      .with(['space', 'space.user', 'user'])
      .latest('acceptedAt')
      .paginate(perPage(this.query, { perPage: 50, maxPerPage: 100 }))

    return new SharedSpaceCollection(memberships).additional({ status: 'success', message: 'OK', code: 200 })
  }

  private async invite(): Promise<SpaceMember> {
    return this.user.spaceInvites().findOrFail(String(this.params.invite))
  }
}
