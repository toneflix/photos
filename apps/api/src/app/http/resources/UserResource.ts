import type { User } from '@app/models/User'
import { Resource } from 'resora'

export class UserResource extends Resource {
  data() {
    const user = this.resource as User

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
