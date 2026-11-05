import { AuthenticationException } from '@arkstack/auth'
import { TwoFactor } from '@app/support/TwoFactor'
import { BaseController } from './BaseController'
import { GenericResource } from 'resora'
import { abortIf } from '@arkstack/common'

/**
 * Two-factor sign-in with an authenticator app, plus one-time recovery codes.
 */
export default class TwoFactorController extends BaseController {
  async show() {
    return new GenericResource(await TwoFactor.readStatus(this.user.id)).additional({
      status: 'success',
      message: 'OK',
      code: 200,
    })
  }

  /** Start setup with a fresh secret. Nothing changes until `enable` confirms a code. */
  async setup() {
    const status = await TwoFactor.readStatus(this.user.id)

    abortIf(status.enabled, 'Two-step sign-in is already on.', 422)

    const setup = TwoFactor.createSetup(this.user as never)

    await TwoFactor.setSecret(this.user.id, setup.secret)

    return new GenericResource(setup).additional({ status: 'success', message: 'Scan the code to continue', code: 200 })
  }

  /** Turn two-factor on once the app shows a matching code, and hand out recovery codes. */
  async enable() {
    const data = await this.validate({ code: 'required|string|max:12' })
    const secret = await TwoFactor.getSecret(this.user.id)
    const valid = !!secret && TwoFactor.verifyCode(this.user as never, secret, String(data.code).replace(/\s/g, ''))

    if (!valid) {
      throw new AuthenticationException('That code is not right', {
        req: this.ctx.req as never,
        status: 422,
        errors: { code: ['That code is not right. Check the time on your phone and try again.'] },
      })
    }

    const recoveryCodes = TwoFactor.generateBackupCodes()

    await TwoFactor.writeRecoveryCodeHashes(this.user.id, await TwoFactor.hashBackupCodes(recoveryCodes))
    await TwoFactor.setMethod(this.user.id, 'authenticator')
    await TwoFactor.setEnabledAt(this.user.id)

    return new GenericResource({ ...(await TwoFactor.readStatus(this.user.id)), recoveryCodes }).additional({
      status: 'success',
      message: 'Two-step sign-in is on',
      code: 200,
    })
  }

  async regenerateRecoveryCodes() {
    const status = await TwoFactor.readStatus(this.user.id)

    abortIf(!status.enabled, 'Turn on two-step sign-in first.', 422)

    const recoveryCodes = TwoFactor.generateBackupCodes()

    await TwoFactor.writeRecoveryCodeHashes(this.user.id, await TwoFactor.hashBackupCodes(recoveryCodes))

    return new GenericResource({ ...(await TwoFactor.readStatus(this.user.id)), recoveryCodes }).additional({
      status: 'success',
      message: 'New recovery codes ready',
      code: 200,
    })
  }

  async disable() {
    const data = await this.validate({ password: 'required|string' })

    await this.confirmPassword(data.password)
    await TwoFactor.clear(this.user.id)

    return new GenericResource(await TwoFactor.readStatus(this.user.id)).additional({
      status: 'success',
      message: 'Two-step sign-in is off',
      code: 200,
    })
  }
}
