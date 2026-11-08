import { BaseController } from '../BaseController'
import { Document, type DocumentDetails } from '@app/models/Document'
import { DocumentCollection } from '@app/http/resources/DocumentCollection'
import { DocumentResource } from '@app/http/resources/DocumentResource'
import { perPage } from '@arkstack/common'
import { regex } from 'kanun'

const SLUG = regex(Document.SLUG)

/** Every field a document form sends. */
const rules = (creating: boolean) => ({
  title: `${creating ? 'required' : 'nullable'}|string|max:120`,
  slug: ['nullable', 'string', 'min:2', 'max:60', SLUG],
  type: `nullable|in:${Document.TYPES.join(',')}`,
  summary: 'nullable|string|max:300',
  body: `${creating ? 'required' : 'nullable'}|string|max:100000`,
  sort: 'nullable|integer|min:0|max:1000',
  published: 'nullable|boolean',
})

/** Only the fields that were sent, so a missing field keeps what the document has. */
const details = (data: Record<string, any>): DocumentDetails =>
  Object.fromEntries(
    Object.entries({
      title: data.title,
      slug: data.slug,
      type: data.type,
      summary: data.summary,
      body: data.body ?? undefined,
      sort: data.sort === undefined || data.sort === null ? undefined : Number(data.sort),
      published: data.published ?? undefined,
    }).filter(([key, value]) => value !== undefined || (key === 'summary' && 'summary' in data)),
  )

/** Admins write the privacy policy, terms, about page and any other pages. */
export default class DocumentController extends BaseController {
  /** Every document, drafts too, in the order admins set. */
  async index() {
    const filters = await this.validateQuery({ type: `nullable|in:${Document.TYPES.join(',')}` })
    const documents = await Document.scope('ofType', filters.type)
      .scope('ordered')
      .paginate(perPage(this.query, { perPage: 50, maxPerPage: 100 }))

    return new DocumentCollection(documents).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async show() {
    const document = await Document.query().findOrFail(String(this.params.document))

    return new DocumentResource(document).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async create() {
    const data = await this.validate(rules(true))
    const document = await Document.open({ ...details(data), title: data.title, body: data.body })

    return new DocumentResource(document).additional({ status: 'success', message: 'Page created', code: 201 }).response().setStatusCode(201)
  }

  async update() {
    const document = await Document.query().findOrFail(String(this.params.document))
    const data = await this.validate(rules(false))

    await document.revise(details(data))

    return new DocumentResource(document).additional({ status: 'success', message: 'Page saved', code: 200 })
  }

  async destroy() {
    const document = await Document.query().findOrFail(String(this.params.document))

    await document.remove()

    return new DocumentResource(document).additional({ status: 'success', message: 'Page deleted', code: 200 })
  }
}
