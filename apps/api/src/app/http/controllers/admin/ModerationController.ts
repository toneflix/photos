import { type ModeratedKind, Moderation } from '@app/services/Moderation'
import { BaseController } from '../BaseController'
import { ModerationItemCollection } from '@app/http/resources/ModerationItemCollection'
import { ModerationItemResource } from '@app/http/resources/ModerationItemResource'
import { abortIf, perPage } from '@arkstack/common'

/** Moderators review public photos, books and spaces, and take any of them off Explore. */
export default class ModerationController extends BaseController {
  async index() {
    const filters = await this.validateQuery({ q: 'nullable|string|max:100' })
    const items = await this.moderation()
      .listed(filters.q)
      .paginate(perPage(this.query, { perPage: 30, maxPerPage: 100 }))

    return new ModerationItemCollection(items).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async unpublish() {
    const moderation = this.moderation()
    const item = await moderation.find(String(this.params.item))

    await moderation.unpublish(item)

    return new ModerationItemResource(item).additional({ status: 'success', message: 'Taken off Explore', code: 200 })
  }

  private moderation(): Moderation {
    const kind = String(this.params.kind) as ModeratedKind

    abortIf(!Moderation.KINDS.includes(kind), 'Not found!', 404)

    return new Moderation(kind)
  }
}
