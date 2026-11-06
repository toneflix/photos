import { abortIf } from '@arkstack/common'
import { Book } from './Book'
import { Model } from '@arkstack/database'
import { Photo } from './Photo'
import { User } from './User'
import { matches } from '@app/support/search'
import type { QueryBuilder } from 'arkormx'
import { randomBytes } from 'node:crypto'

export type SpaceVisibility = 'private' | 'public'

/** What someone searched for and how they narrowed it. */
export interface SpaceFilters {
  q?: string | null
  sort?: string | null
}

export interface SpaceDetails {
  name: string
  slug?: string | null
  description?: string | null
  visibility?: SpaceVisibility | null
}

/**
 * A creator's collection of photos and books, like an organisation with its own page.
 * Spaces start private; a public space has a browse page scoped to its contents.
 */
export class Space extends Model {
  declare id: string
  declare userId: string
  declare name: string
  declare slug: string
  declare description: string | null
  declare visibility: SpaceVisibility
  declare publishedAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date

  static readonly VISIBILITIES = ['private', 'public']

  /** Lowercase words joined by single dashes, e.g. `ada-weddings`. */
  static readonly SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

  protected static override table = 'spaces'

  protected static override columns = {
    userId: 'user_id',
    publishedAt: 'published_at',
  }

  user() {
    return this.belongsTo(User, 'userId')
  }

  photos() {
    return this.hasMany(Photo, 'spaceId')
  }

  books() {
    return this.hasMany(Book, 'spaceId')
  }

  /** Make a space for `owner`. The web address comes from the name unless one is given. */
  static async open(owner: User, details: SpaceDetails): Promise<Space> {
    const visibility = details.visibility ?? 'private'

    return Space.query().create({
      userId: owner.id,
      name: details.name.trim(),
      slug: details.slug || (await Space.freeSlug(details.name)),
      description: details.description?.trim() || null,
      visibility,
      publishedAt: visibility === 'public' ? new Date() : null,
    })
  }

  /** A web address made from `text` that no other space uses yet. */
  static async freeSlug(text: string): Promise<string> {
    const base =
      text
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60)
        .replace(/-+$/, '') || 'space'

    let slug = base

    while (await Space.query().where({ slug }).exists()) slug = `${base}-${randomBytes(3).toString('hex')}`

    return slug
  }

  /** Public spaces for Explore. Words match names, descriptions and shown owner names. */
  static published(filters: SpaceFilters = {}) {
    const query = Space.query().where({ visibility: 'public' })
    const text = filters.q?.trim()

    if (text) {
      query.where((match: QueryBuilder<Space>) =>
        match
          .where(matches('name', text))
          .orWhere(matches('description', text))
          .orWhereHas('user', (owner: QueryBuilder<User>) => owner.where({ showOwnerName: true }).where(matches('name', text))),
      )
    }

    return filters.sort === 'oldest' ? query.oldest('publishedAt') : query.latest('publishedAt')
  }

  /** The space at `slug` when `viewer` may browse it; a 404 otherwise. */
  static async browse(slug: string, viewer: User | null): Promise<Space> {
    const space = await Space.query().where({ slug }).with('user').first()

    abortIf(!space?.isVisibleTo(viewer), 'Space not found!', 404)

    return space!
  }

  /** Keep photos and books that sit in private spaces off public lists. */
  static listedOnly<T extends Photo | Book>(query: QueryBuilder<T>): QueryBuilder<T> {
    return query.whereDoesntHave('space', (space: QueryBuilder<Space>) => space.where({ visibility: 'private' }))
  }

  /** Owners always see their spaces; everyone sees public ones. */
  isVisibleTo(viewer: User | null): boolean {
    return this.visibility === 'public' || this.isOwnedBy(viewer)
  }

  isOwnedBy(viewer: User | null): boolean {
    return viewer?.id === this.userId
  }

  /** Show or hide the space. Publishing again moves it back to the top of Explore. */
  setVisibility(visibility: SpaceVisibility): void {
    if (visibility === this.visibility) return

    this.visibility = visibility
    this.publishedAt = visibility === 'public' ? new Date() : null
  }

  /** Photos in the space; only the public ones unless `everything`. */
  contentPhotos(everything = false) {
    const query = this.photos()

    return everything ? query : query.where({ visibility: 'public' })
  }

  /** Books in the space; only the public ones with pages unless `everything`. */
  contentBooks(everything = false) {
    const query = this.books()

    return everything ? query : query.where({ visibility: 'public' }).has('pages')
  }
}
