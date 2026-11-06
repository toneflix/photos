import { Book } from '@app/models/Book'
import { Photo } from '@app/models/Photo'
import { Space } from '@app/models/Space'
import { User } from '@app/models/User'
import { matches } from '@app/support/search'
import type { QueryBuilder } from 'arkormx'

export type ModeratedKind = 'photos' | 'books' | 'spaces'

export type Moderated = Photo | Book | Space

/**
 * Review of what people show on Explore. Moderators see everything public of one
 * kind and can take any of it down, which makes it private again for its owner.
 */
export class Moderation {
  static readonly KINDS: ModeratedKind[] = ['photos', 'books', 'spaces']

  constructor(readonly kind: ModeratedKind) {}

  /** Public items of this kind, newest first. Words match titles and owner names or emails. */
  listed(q?: string | null): QueryBuilder<Moderated> {
    const text = q?.trim()
    const query = this.query().where({ visibility: 'public' }).with('user') as QueryBuilder<Moderated>

    if (text) {
      query.where((match: QueryBuilder<Moderated>) =>
        match
          .where(matches(this.titleColumn(), text))
          .orWhereHas('user', (owner: QueryBuilder<User>) => owner.where(matches('name', text)).orWhere(matches('email', text))),
      )
    }

    return query.latest('publishedAt')
  }

  find(id: string): Promise<Moderated> {
    return this.query().findOrFail(id) as Promise<Moderated>
  }

  /** Take an item off Explore. Its owner keeps it, now private. */
  async unpublish(item: Moderated): Promise<void> {
    item.setVisibility('private')

    await item.save()
  }

  private query() {
    if (this.kind === 'photos') return Photo.query()
    if (this.kind === 'books') return Book.query()

    return Space.query()
  }

  private titleColumn(): string {
    if (this.kind === 'photos') return 'caption'
    if (this.kind === 'books') return 'title'

    return 'name'
  }
}
