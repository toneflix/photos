import { User } from '@app/models/User'
import { Resource } from 'resora'

/** Who made a public photo or book. Owners who keep their name off shared work stay anonymous. */
export class OwnerResource extends Resource {
  async data() {
    const user = this.resource

    if (!(user instanceof User) || !user.showOwnerName) return { id: null, name: null, avatarUrl: null }

    return { id: user.id, name: user.name, avatarUrl: await user.avatarUrl() }
  }
}
