import { Resource } from 'resora'

/** Sent instead of a token when the account needs a second sign-in step. */
export class TwoFactorChallengeResource extends Resource {
  data() {
    const { challengeToken } = this.resource as { challengeToken: string }

    return { twoFactor: true, challengeToken }
  }
}
