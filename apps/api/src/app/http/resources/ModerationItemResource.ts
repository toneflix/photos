import { Book } from '@app/models/Book'
import type { Moderated } from '@app/services/Moderation'
import { Photo } from '@app/models/Photo'
import { Resource } from 'resora'
import type { Space } from '@app/models/Space'
import type { User } from '@app/models/User'

/** A public photo, book or space under review, with its owner. Expects the `user` relation to be loaded. */
export class ModerationItemResource extends Resource {
  async data() {
    const item = this.resource as Moderated
    const owner = item.getAttribute('user' as never) as User | null

    return {
      id: item.id,
      kind: item instanceof Photo ? 'photo' : item instanceof Book ? 'book' : 'space',
      title: this.title(item),
      imageUrl: await this.imageUrl(item),
      visibility: item.visibility,
      publishedAt: item.publishedAt,
      owner: owner ? { id: owner.id, name: owner.name, email: owner.email } : null,
    }
  }

  private title(item: Moderated): string {
    if (item instanceof Photo) return item.caption || item.originalName || 'Untitled photo'
    if (item instanceof Book) return item.title

    return (item as Space).name
  }

  private async imageUrl(item: Moderated): Promise<string | null> {
    if (item instanceof Photo) return item.url()

    const photo = item instanceof Book ? await item.coverPhoto() : await (item as Space).contentPhotos().latest('createdAt').first()

    return photo ? photo.url() : null
  }
}
