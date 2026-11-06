import { Auth, AuthenticationException } from '@arkstack/auth'
import { Hash, abort } from '@arkstack/common'
import { Cache } from '@arkstack/cache'
import { Settings } from '@app/support/Settings'
import { Throttle } from '@app/support/Throttle'
import { TwoFactor } from '@app/support/TwoFactor'
import type { Request } from 'express'
import { User } from '@app/models/User'
import { randomUUID } from 'node:crypto'

export interface TwoFactorAnswer {
  code?: string | null
  recoveryCode?: string | null
}

/**
 * Signing in with a password and, when it is on, a two-step code. Wrong guesses
 * are counted, and further tries are refused for a while once too many fail.
 */
export class SignIn {
  /** Wrong two-step or recovery codes allowed for one account within the lockout. */
  static readonly MAX_CODE_ATTEMPTS = 5

  /** How long a used authenticator code stays refused: its 30-second step plus the one either side. */
  static readonly USED_CODE_SECONDS = 90

  /** A hash checked when no account matches, so a missing account takes as long to refuse as a wrong password. */
  private static decoyHash?: Promise<string>

  readonly auth: Auth

  constructor(private readonly req: Request) {
    this.auth = Auth.make().setRequest(req as never)
  }

  /** How long sign-in pauses after too many wrong guesses, from the `accounts.lockout_minutes` setting. */
  static async lockoutSeconds(): Promise<number> {
    return (await Settings.number('accounts.lockout_minutes')) * 60
  }

  /** The account behind an email and password. A wrong password and an unknown email get the same answer. */
  async attempt(email: string, password: string): Promise<User> {
    const throttle = new Throttle(`sign-in:${email}|${this.req.ip}`, await Settings.number('accounts.max_password_attempts'), await SignIn.lockoutSeconds())

    await throttle.ensureAllowed('Too many sign-in attempts.')

    SignIn.decoyHash ??= Hash.make(randomUUID())

    const user = await User.query().where({ email }).first()
    const valid = await Hash.verify(password, user?.password ?? (await SignIn.decoyHash))

    if (!user || !valid) {
      await throttle.hit()

      throw new AuthenticationException('Email or password is not right', {
        req: this.req as never,
        status: 422,
        errors: { password: ['Email or password is not right'] },
      })
    }

    await throttle.clear()

    if (user.isSuspended()) abort('This account is suspended. Contact support if you think this is a mistake.', 403)

    return user
  }

  /** The account a two-factor challenge was issued for, once its code or a recovery code checks out. */
  async completeTwoFactor(challengeToken: string, answer: TwoFactorAnswer): Promise<User> {
    const user = (await this.auth.authorizeTemporaryToken(challengeToken, 'two-factor-login')) as User
    const throttle = new Throttle(`two-factor:${user.id}`, SignIn.MAX_CODE_ATTEMPTS, await SignIn.lockoutSeconds())

    await throttle.ensureAllowed('Too many wrong codes.')

    const secret = await TwoFactor.getSecret(user.id)
    const code = answer.code?.replace(/\s/g, '')
    const valid = !!secret && !!code && TwoFactor.verifyCode(user as never, secret, code)
    const passed = answer.recoveryCode
      ? await TwoFactor.consumeRecoveryCode(user.id, answer.recoveryCode.trim())
      : valid && (await Cache.add(`two-factor-used:${user.id}:${code}`, true, SignIn.USED_CODE_SECONDS))

    if (!passed) {
      await throttle.hit()
      abort('That code is not right. Try again.', 422)
    }

    await throttle.clear()

    return user
  }
}
