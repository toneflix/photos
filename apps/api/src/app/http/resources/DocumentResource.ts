import type { Document } from '@app/models/Document'
import { Resource } from 'resora'

/** A document with its Markdown body. */
export class DocumentResource extends Resource {
  data() {
    const document = this.resource as Document

    return {
      id: document.id,
      slug: document.slug,
      type: document.type,
      title: document.title,
      summary: document.summary,
      body: document.body,
      sort: document.sort,
      published: document.isPublished(),
      publishedAt: document.publishedAt,
      builtIn: document.isBuiltIn(),
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    }
  }
}
