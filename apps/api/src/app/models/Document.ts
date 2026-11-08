import { Model } from '@arkstack/database'
import type { QueryBuilder } from 'arkormx'
import { ValidationException } from 'kanun'

export type DocumentType = 'page' | 'policy'

export interface DocumentDetails {
  title?: string
  slug?: string | null
  type?: DocumentType
  summary?: string | null
  body?: string
  sort?: number
  published?: boolean
}

/**
 * A page of writing the app shows to everyone, like the privacy policy or the about page.
 * The body is Markdown. Policies are the rules people agree to; pages are everything else.
 * The privacy policy, terms of use and about page are built in: the apps link to them by
 * slug, so they stay published and keep their slug.
 */
export class Document extends Model {
  declare id: string
  declare slug: string
  declare type: DocumentType
  declare title: string
  declare summary: string | null
  declare body: string
  declare sort: number
  declare publishedAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date

  static readonly TYPES: DocumentType[] = ['page', 'policy']

  static readonly PRIVACY = 'privacy'
  static readonly TERMS = 'terms'
  static readonly ABOUT = 'about'
  static readonly BUILT_IN = [Document.PRIVACY, Document.TERMS, Document.ABOUT]

  /** Lowercase words joined by single dashes, e.g. `community-guidelines`. */
  static readonly SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

  protected static override table = 'documents'

  protected static override columns = {
    publishedAt: 'published_at',
  }

  protected override casts = {
    sort: 'number',
  } as never

  /** Make a document. Its slug comes from the title unless one is given. */
  static async open(details: DocumentDetails & { title: string; body: string }): Promise<Document> {
    const document = new Document({ type: 'page', sort: 0, publishedAt: null })

    await document.revise({ ...details, slug: details.slug || (await Document.freeSlug(details.title)) })

    return document
  }

  /** A slug made from `title` that no other document uses yet. */
  static async freeSlug(title: string): Promise<string> {
    const base =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'page'

    let slug = base

    for (let n = 2; await Document.query().where({ slug }).exists(); n++) slug = `${base}-${n}`

    return slug
  }

  isBuiltIn(): boolean {
    return Document.BUILT_IN.includes(this.slug)
  }

  isPublished(): boolean {
    return !!this.publishedAt
  }

  /** Change the document. Built-in documents keep their slug and stay published. */
  async revise(details: DocumentDetails): Promise<void> {
    const builtIn = this.id && this.isBuiltIn()

    if (builtIn && details.slug && details.slug !== this.slug) {
      throw ValidationException.withMessages({ slug: "The apps link to this page, so its address can't change." })
    }

    if (builtIn && details.published === false) {
      throw ValidationException.withMessages({ published: "The apps link to this page, so it can't be unpublished." })
    }

    if (details.slug && details.slug !== this.slug && (await Document.query().where({ slug: details.slug }).exists())) {
      throw ValidationException.withMessages({ slug: 'Another page already uses this address.' })
    }

    if (details.title) this.title = details.title.trim()
    if (details.slug) this.slug = details.slug
    if (details.type) this.type = details.type
    if (details.summary !== undefined) this.summary = details.summary?.trim() || null
    if (details.body !== undefined) this.body = details.body.trim()
    if (details.sort !== undefined) this.sort = details.sort
    if (details.published !== undefined) this.publishedAt = details.published ? (this.publishedAt ?? new Date()) : null

    await this.save()
  }

  /** Delete the document. Built-in documents stay. */
  async remove(): Promise<void> {
    if (this.isBuiltIn()) throw ValidationException.withMessages({ document: "The apps link to this page, so it can't be deleted." })

    await this.delete()
  }

  /** Documents everyone can read. */
  scopePublished(query: QueryBuilder<Document>): QueryBuilder<Document> {
    return query.whereNotNull('publishedAt')
  }

  /** Documents of one type, or every type when none is given. */
  scopeOfType(query: QueryBuilder<Document>, type?: DocumentType | null): QueryBuilder<Document> {
    return type ? query.where({ type }) : query
  }

  /** Documents in the order admins set, then by title. */
  scopeOrdered(query: QueryBuilder<Document>): QueryBuilder<Document> {
    return query.orderBy([{ sort: 'asc' }, { title: 'asc' }])
  }
}
