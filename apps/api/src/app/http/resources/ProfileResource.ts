import { ContentStats } from '@app/services/ContentStats'
import { Resource } from 'resora'
import type { User } from '@app/models/User'

/** A maker's public profile: who they are, how much they show everyone and, when they allow it, how often it is seen. */
export class ProfileResource extends Resource {
  private viewer: User | null = null

  for(viewer: User | null) {
    this.viewer = viewer

    return this
  }

  async data() {
    const user = this.resource as User

    return {
      id: user.id,
      name: user.name,
      avatarUrl: await user.avatarUrl(),
      joinedAt: user.createdAt,
      photoCount: await user.photos().scope('public').scope('listed').count(),
      bookCount: await user.books().scope('public').scope('listed').count(),
      spaceCount: await user.spaces().where({ visibility: 'public' }).count(),
      stats: await ContentStats.profile(user, this.viewer),
      isOwner: this.viewer?.id === user.id,
      isListed: user.hasProfile(),
    }
  }
}
