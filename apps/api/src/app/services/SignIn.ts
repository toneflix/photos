import { Auth, AuthenticationException } from '@arkstack/auth'
import { Throttle } from '@app/support/Throttle'
import { TwoFactor } from '@app/support/TwoFactor'
import type { Request } from 'express'
import type { User } from '@app/models/User'
import { abort } from '@arkstack/common'

export interface TwoFactorAnswer {
  code?: string | null
  recoveryCode?: string | null
}

/**
 * Signing in with a password and, when it is on, a two-step code. Wrong guesses
 * are counted, and further tries are refused for a while once too many fail.
 */
export class SignIn {
  /** Wrong passwords allowed for one email from one IP within LOCKOUT_SECONDS. */
  static readonly MAX_PASSWORD_ATTEMPTS = 5

  /** Wrong two-step or recovery codes allowed for one account within LOCKOUT_SECONDS. */
  static readonly MAX_CODE_ATTEMPTS = 5

  static readonly LOCKOUT_SECONDS = 15 * 60

  readonly auth: Auth

  constructor(private readonly req: Request) {
    this.auth = Auth.make().setRequest(req as never)
  }

  /** The account behind an email and password. */
  async attempt(email: string, password: string): Promise<User> {
    const throttle = new Throttle(`sign-in:${email}|${this.req.ip}`, SignIn.MAX_PASSWORD_ATTEMPTS, SignIn.LOCKOUT_SECONDS)

    await throttle.ensureAllowed('Too many sign-in attempts.')

    const user = (await this.auth.attempt(email, password).catch(async (error) => {
      if (error instanceof AuthenticationException) await throttle.hit()

      throw error
    })) as User

    await throttle.clear()

    return user
  }

  /** The account a two-factor challenge was issued for, once its code or a recovery code checks out. */
  async completeTwoFactor(challengeToken: string, answer: TwoFactorAnswer): Promise<User> {
    const user = (await this.auth.authorizeTemporaryToken(challengeToken, 'two-factor-login')) as User
    const throttle = new Throttle(`two-factor:${user.id}`, SignIn.MAX_CODE_ATTEMPTS, SignIn.LOCKOUT_SECONDS)

    await throttle.ensureAllowed('Too many wrong codes.')

    const secret = await TwoFactor.getSecret(user.id)
    const code = answer.code?.replace(/\s/g, '')
    const passed = answer.recoveryCode
      ? await TwoFactor.consumeRecoveryCode(user.id, answer.recoveryCode.trim())
      : !!secret && !!code && TwoFactor.verifyCode(user as never, secret, code)

    if (!passed) {
      await throttle.hit()
      abort('That code is not right. Try again.', 422)
    }

    await throttle.clear()

    return user
  }
}
