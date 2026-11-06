import type { Moderated } from '@app/services/Moderation'
import { ContentStats } from '@app/services/ContentStats'
import { ModerationItemResource } from './ModerationItemResource'
import { Resource } from 'resora'
import type { User } from '@app/models/User'

/** How often a maker's photos, books and spaces are seen: totals, views and downloads per day, and their most viewed work. */
export class MakerStatsResource extends Resource {
  private days = 30

  over(days: number) {
    this.days = days

    return this
  }

  async data() {
    const user = this.resource as User
    const top = async (items: Moderated[]) => Promise.all(items.map((item) => new ModerationItemResource(item).data()))
    const photos = await user.photos().with('user').latest('viewCount').take(5).getResults()
    const books = await user.books().with('user').latest('viewCount').take(5).getResults()
    const spaces = await user.spaces().with('user').latest('viewCount').take(5).getResults()

    return {
      photoCount: await user.photos().count(),
      bookCount: await user.books().count(),
      spaceCount: await user.spaces().count(),
      totals: await ContentStats.totals({ ownerId: user.id }),
      daily: await ContentStats.daily({ ownerId: user.id }, this.days),
      topPhotos: await top(photos.all()),
      topBooks: await top(books.all()),
      topSpaces: await top(spaces.all()),
    }
  }
}
