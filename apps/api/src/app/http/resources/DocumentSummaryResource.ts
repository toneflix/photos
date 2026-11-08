import type { Document } from '@app/models/Document'
import { Resource } from 'resora'

/** A document for lists and links, without its body. */
export class DocumentSummaryResource extends Resource {
  data() {
    const document = this.resource as Document

    return {
      id: document.id,
      slug: document.slug,
      type: document.type,
      title: document.title,
      summary: document.summary,
      sort: document.sort,
      published: document.isPublished(),
      publishedAt: document.publishedAt,
      builtIn: document.isBuiltIn(),
      updatedAt: document.updatedAt,
    }
  }
}
