import type { AdminOverview } from '@app/services/AdminOverview'
import { AdminUserResource } from './AdminUserResource'
import { Resource } from 'resora'

/** The admin overview counts, with the newest accounts. */
export class AdminOverviewResource extends Resource {
  async data() {
    const { recentUsers, ...counts } = this.resource as Awaited<ReturnType<AdminOverview['summary']>>

    return {
      ...counts,
      recentUsers: await Promise.all(recentUsers.map((user) => new AdminUserResource(user).data())),
    }
  }
}
