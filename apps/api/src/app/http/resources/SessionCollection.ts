import { SessionResource } from './SessionResource'
import { Collection } from './Collection'

export class SessionCollection extends Collection {
  collects = SessionResource
  private currentToken: string | null = null

  current(token: string | null) {
    this.currentToken = token

    return this
  }

  data() {
    return (this.resource as any[]).map((session) => new SessionResource(session).current(this.currentToken).data())
  }
}
