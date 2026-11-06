import { BaseController } from './BaseController'
import { GenericResource } from 'resora'
import { SessionCollection } from '@app/http/resources/SessionCollection'
import { SessionResource } from '@app/http/resources/SessionResource'

/**
 * Devices signed in to the account. Each is a personal access token.
 */
export default class SessionController extends BaseController {
  async index() {
    const sessions = await this.user.personalAccessTokens().latest('lastUsedAt').getResults()

    return new SessionCollection(sessions.all())
      .current(this.currentToken)
      .additional({ status: 'success', message: 'OK', code: 200 })
  }

  async destroy() {
    const session = await this.user.personalAccessTokens().findOrFail(String(this.params.session))

    await session.delete()

    return new SessionResource(session)
      .current(this.currentToken)
      .additional({ status: 'success', message: 'Device signed out', code: 200 })
  }

  /** Sign out everywhere except this device. */
  async destroyOthers() {
    const revoked = await this.user.signOutOtherSessions(this.currentToken)

    return new GenericResource({ revoked }).additional({ status: 'success', message: 'Other devices signed out', code: 200 })
  }

  private get currentToken(): string | null {
    return (this.ctx.req as any).authToken ?? null
  }
}
