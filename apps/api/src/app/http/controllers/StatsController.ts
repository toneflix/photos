import { type ModeratedKind, Moderation } from '@app/services/Moderation'
import { BaseController } from './BaseController'
import { Book } from '@app/models/Book'
import { Limits } from '@app/policies/Limits'
import { MakerStatsResource } from '@app/http/resources/MakerStatsResource'
import { ModerationItemDetailResource } from '@app/http/resources/ModerationItemDetailResource'
import { abortIf } from '@arkstack/common'

/** Makers see how often their own photos, books and spaces are viewed and downloaded. */
export default class StatsController extends BaseController {
  /** Totals and a daily chart across everything the signed-in maker owns, with their most viewed work. */
  async overview() {
    const filters = await this.validateQuery({ days: 'nullable|integer|min:7|max:365' })

    return new MakerStatsResource(this.user)
      .over(Number(filters.days) || 30)
      .additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** One of the maker's own items with its views and downloads per day. Book charts need `book_stats` on the plan. */
  async show() {
    const filters = await this.validateQuery({ days: 'nullable|integer|min:7|max:365' })
    const kind = String(this.params.kind) as ModeratedKind

    abortIf(!Moderation.KINDS.includes(kind), 'Not found!', 404)

    const item = await this.user
      .work(kind)
      .with('user')
      .findOrFail(String(this.params.item))
    const charted = !(item instanceof Book) || (await (await Limits.for(this.user)).allows('book_stats'))

    return new ModerationItemDetailResource(item)
      .over(Number(filters.days) || 30, charted)
      .additional({ status: 'success', message: 'OK', code: 200 })
  }
}
