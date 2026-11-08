import type { ID } from './models'

/** Policies are the rules people agree to; pages are everything else. */
export type DocumentType = 'page' | 'policy'

/** The pages the apps link to by slug. They stay published and keep their slug. */
export const BUILT_IN_DOCUMENTS = { privacy: 'privacy', terms: 'terms', about: 'about' } as const

/** A page or policy for lists and links, without its body. */
export interface DocumentSummary {
  id: ID
  slug: string
  type: DocumentType
  title: string
  summary: string | null
  sort: number
  published: boolean
  publishedAt: string | null
  builtIn: boolean
  updatedAt: string
}

/** A page or policy with its Markdown body. */
export interface SiteDocument extends DocumentSummary {
  body: string
  createdAt: string
}

/** What admins send to write a page. Fields left out keep what the page has. */
export interface DocumentInput {
  title?: string
  slug?: string | null
  type?: DocumentType
  summary?: string | null
  body?: string
  sort?: number
  published?: boolean
}
