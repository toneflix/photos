import { AdminUserResource } from './AdminUserResource'
import { Book } from '@app/models/Book'
import type { Moderated } from '@app/services/Moderation'
import { Photo } from '@app/models/Photo'
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
    const photos = await Photo.query().where({ userId: user.id, visibility: 'public' }).with('user').latest('viewCount').take(5).get()
    const books = await Book.query().where({ userId: user.id, visibility: 'public' }).with('user').latest('viewCount').take(5).get()

    return {
      ...(await super.data()),
      spaceCount: await user.spaces().count(),
      publicPhotoCount: await user.photos().where({ visibility: 'public' }).count(),
      publicBookCount: await user.books().where({ visibility: 'public' }).count(),
      showCounts: user.showCounts,
      totals: await ContentStats.totals({ ownerId: user.id }),
      daily: await ContentStats.daily({ ownerId: user.id }, this.days),
      topPhotos: await top(photos.all()),
      topBooks: await top(books.all()),
    }
  }
}
