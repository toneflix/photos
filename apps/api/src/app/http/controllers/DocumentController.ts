import { BaseController } from './BaseController'
import { Document } from '@app/models/Document'
import { DocumentCollection } from '@app/http/resources/DocumentCollection'
import { DocumentResource } from '@app/http/resources/DocumentResource'
import { perPage } from '@arkstack/common'

/** Published pages and policies, open to everyone. */
export default class DocumentController extends BaseController {
  /** Published documents in the order admins set, optionally of one type. */
  async index() {
    const filters = await this.validateQuery({ type: `nullable|in:${Document.TYPES.join(',')}` })
    const documents = await Document.scope('published')
      .scope('ofType', filters.type)
      .scope('ordered')
      .paginate(perPage(this.query, { perPage: 50, maxPerPage: 100 }))

    return new DocumentCollection(documents).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async show() {
    const document = await Document.scope('published')
      .where({ slug: String(this.params.document) })
      .firstOrFail()

    return new DocumentResource(document).additional({ status: 'success', message: 'OK', code: 200 })
  }
}
