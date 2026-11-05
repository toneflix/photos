import type { User } from '@app/models/User'
import { Resource } from 'resora'
import { UserResource } from './UserResource'

/** A signed-in user with the bearer token issued to them. */
export class AccessTokenResource extends Resource {
  data() {
    const { user, token } = this.resource as { user: User; token: { token: string; expiresAt?: Date | null } }

    return {
      user: new UserResource(user).data(),
      token: token.token,
      expiresAt: token.expiresAt ?? null,
    }
  }
}
