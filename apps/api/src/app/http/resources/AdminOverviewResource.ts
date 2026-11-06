import type { AdminOverview } from '@app/services/AdminOverview'
import { AdminUserResource } from './AdminUserResource'
import { ModerationItemResource } from './ModerationItemResource'
import { Resource } from 'resora'

/** The admin overview counts, with the newest accounts. */
export class AdminOverviewResource extends Resource {
  async data() {
    const { recentUsers, topPhotos, ...counts } = this.resource as Awaited<ReturnType<AdminOverview['summary']>>

    return {
      ...counts,
      recentUsers: await Promise.all(recentUsers.map((user) => new AdminUserResource(user).data())),
      topPhotos: await Promise.all(topPhotos.map((photo) => new ModerationItemResource(photo).data())),
    }
  }
}
