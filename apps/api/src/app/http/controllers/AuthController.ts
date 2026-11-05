import { Auth } from '@arkstack/auth'
import { TwoFactor } from '@app/support/TwoFactor'
import { AccessTokenResource } from '@app/http/resources/AccessTokenResource'
import { AccountMail } from '@app/notifications/AccountMail'
import { BaseController } from './BaseController'
import { GenericResource } from 'resora'
import { Hash, assertFound } from '@arkstack/common'
import { PasswordReset } from '@app/models/PasswordReset'
import { SignIn } from '@app/services/SignIn'
import { TwoFactorChallengeResource } from '@app/http/resources/TwoFactorChallengeResource'
import { User } from '@app/models/User'
import { UserResource } from '@app/http/resources/UserResource'

/**
 * Sign up, sign in (with an optional two-factor step), sign out, password
 * resets and email verification. Sessions are bearer tokens (personal access tokens).
 */
export default class AuthController extends BaseController {
  async register() {
    this.body.email = User.normalizeEmail(this.body.email)

    const data = await this.validate({
      name: 'required|string|max:120',
      email: 'required|email|max:191|unique:users,email',
      password: 'required|string|min:8|max:191',
    })

    const user = await User.query().create({
      name: String(data.name).trim(),
      email: String(data.email),
      password: await Hash.make(String(data.password)),
    })

    await user.sendVerificationEmail().catch((error) => console.error('Verification email failed', error))

    const token = await Auth.make()
      .setRequest(this.ctx.req as never)
      .create(user as never)

    return new AccessTokenResource({ user, token })
      .additional({ status: 'success', message: 'Welcome to Toneflix Photos', code: 201 })
      .response()
      .setStatusCode(201)
  }

  /** Check the password, then either issue a token or ask for the two-factor code. */
  async login() {
    this.body.email = User.normalizeEmail(this.body.email)

    const data = await this.validate({
      email: 'required|email',
      password: 'required|string',
    })

    const signIn = new SignIn(this.ctx.req as never)
    const user = await signIn.attempt(String(data.email), String(data.password))
    const status = await TwoFactor.readStatus(user.id)

    if (status.enabled) {
      const challengeToken = await signIn.auth.createTemporaryToken(user as never, 'two-factor-login')

      return new TwoFactorChallengeResource({ challengeToken }).additional({
        status: 'success',
        message: 'Enter the code from your authenticator app',
        code: 200,
      })
    }

    const token = await signIn.auth.create(user as never)

    return new AccessTokenResource({ user, token }).additional({ status: 'success', message: 'Signed in', code: 200 })
  }

  /** Finish signing in with an authenticator code or a recovery code. */
  async twoFactorChallenge() {
    const data = await this.validate({
      challengeToken: 'required|string',
      code: 'nullable|string|max:12',
      recoveryCode: 'nullable|string|max:64',
    })

    const signIn = new SignIn(this.ctx.req as never)
    const user = await signIn.completeTwoFactor(String(data.challengeToken), data)
    const token = await signIn.auth.create(user as never)

    return new AccessTokenResource({ user, token }).additional({ status: 'success', message: 'Signed in', code: 200 })
  }

  async me() {
    return new UserResource(this.user).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async logout() {
    const req = this.ctx.req as any

    await Auth.make()
      .setRequest(req)
      .logout(req.authToken as string)

    return new UserResource(this.user).additional({ status: 'success', message: 'Signed out', code: 200 })
  }

  /** Email a reset link. The answer is the same whether or not the address has an account. */
  async forgotPassword() {
    this.body.email = User.normalizeEmail(this.body.email)

    const data = await this.validate({ email: 'required|email' })
    const email = String(data.email)
    const user = await User.query().where({ email }).first()

    if (user) {
      const reset = await PasswordReset.issueFor(email)

      await AccountMail.resetPassword(user, reset.link(), PasswordReset.TTL_MINUTES).catch((error) =>
        console.error('Password reset email failed', error),
      )
    }

    return new GenericResource({ email }).additional({
      status: 'success',
      message: 'If that address has an account, a reset link is on its way.',
      code: 200,
    })
  }

  async resetPassword() {
    const data = await this.validate({
      token: 'required|string',
      password: 'required|string|min:8|max:191|confirmed',
    })

    const reset = await PasswordReset.fromToken(String(data.token))
    const user = reset && !reset.isExpired() ? await User.query().where({ email: reset.email }).first() : null

    assertFound(user, 'This reset link has expired. Ask for a new one.', 422)

    await user.changePassword(String(data.password))
    await user.markEmailVerified()

    return new UserResource(user).additional({ status: 'success', message: 'Password updated. Sign in with it now.', code: 200 })
  }

  async verifyEmail() {
    const data = await this.validate({
      token: 'required|string',
      email: 'required|email',
    })

    const user = await User.fromVerificationToken(String(data.token), String(data.email))

    assertFound(user, 'This confirmation link has expired. Send yourself a new one from settings.', 422)

    await user.markEmailVerified()

    return new UserResource(user).additional({ status: 'success', message: 'Email confirmed', code: 200 })
  }
}
