import { Book } from '@app/models/Book'
import { ContentStats } from './ContentStats'
import { Photo } from '@app/models/Photo'
import { Space } from '@app/models/Space'
import { Role } from '@app/models/Role'
import { User } from '@app/models/User'
import { where } from 'arkormx'

/** Counts for the admin overview: accounts, uploads and what is public. */
export class AdminOverview {
  static readonly NEW_USER_DAYS = 7

  async summary() {
    const since = new Date(Date.now() - AdminOverview.NEW_USER_DAYS * 24 * 60 * 60 * 1000)

    return {
      users: {
        total: await User.query().count(),
        new: await User.query()
          .where(where('createdAt', '>=', since))
          .count(),
        suspended: await User.query().whereNotNull('suspendedAt').count(),
        staff: await User.query().where(where('role', '<>', Role.MEMBER)).count(),
      },
      photos: {
        total: await Photo.query().count(),
        public: await Photo.query().where({ visibility: 'public' }).count(),
        storageBytes: Number((await Photo.query().sum('size')) ?? 0),
      },
      books: {
        total: await Book.query().count(),
        public: await Book.query().where({ visibility: 'public' }).count(),
      },
      spaces: {
        total: await Space.query().count(),
        public: await Space.query().where({ visibility: 'public' }).count(),
      },
      engagement: await ContentStats.totals({}),
      daily: await ContentStats.daily({}, 30),
      topPhotos: (await Photo.query().where({ visibility: 'public' }).with('user').latest('viewCount').take(5).get()).all(),
      newUserDays: AdminOverview.NEW_USER_DAYS,
      recentUsers: (await User.query().latest('createdAt').take(5).get()).all(),
    }
  }
}
