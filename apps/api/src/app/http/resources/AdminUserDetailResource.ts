import { AdminUserResource } from './AdminUserResource'
import type { Moderated } from '@app/services/Moderation'
import { ContentStats } from '@app/services/ContentStats'
import { ModerationItemResource } from './ModerationItemResource'
import type { User } from '@app/models/User'

/** An account for its admin page: what it holds, how often its work is seen, and its most viewed public work. */
export class AdminUserDetailResource extends AdminUserResource {
  private days = 30

  over(days: number) {
    this.days = days

    return this
  }

  async data() {
    const user = this.resource as User
    const top = async (items: Moderated[]) => Promise.all(items.map((item) => new ModerationItemResource(item).data()))
    const photos = await user.photos().scope('public').with('user').latest('viewCount').take(5).getResults()
    const books = await user.books().where({ visibility: 'public' }).with('user').latest('viewCount').take(5).getResults()
    const plan = await user.plan()
    const current = await user.subscriptions().scope('current').first()
    const paidUntil = await (await user.subscriptions().scope('open').getQuery()).max('endsAt')

    return {
      ...(await super.data()),
      spaceCount: await user.spaces().count(),
      publicPhotoCount: await user.photos().scope('public').count(),
      publicBookCount: await user.books().where({ visibility: 'public' }).count(),
      showCounts: user.showCounts,
      plan: { slug: plan.slug, name: plan.name, endsAt: current ? paidUntil : null },
      totals: await ContentStats.totals({ ownerId: user.id }),
      daily: await ContentStats.daily({ ownerId: user.id }, this.days),
      topPhotos: await top(photos.all()),
      topBooks: await top(books.all()),
    }
  }
}
