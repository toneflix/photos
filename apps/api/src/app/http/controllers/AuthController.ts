import { Auth } from '@arkstack/auth'
import { BaseController } from './BaseController'
import { Hash } from '@arkstack/common'
import { User } from '@app/models/User'
import { serializeUser } from '@app/support/serializers'

/**
 * Sign up, sign in and sign out with bearer tokens (personal access tokens).
 */
export default class AuthController extends BaseController {
  async register() {
    const data = await this.validate({
      name: 'required|string|max:120',
      email: 'required|email|max:191',
      password: 'required|string|min:8|max:191',
    })

    const email = String(data.email).trim().toLowerCase()

    if (await User.query().where({ email }).first()) {
      return this.ctx.res.status(422).json({
        status: 'error',
        message: 'This email is already registered',
        code: 422,
        errors: { email: ['This email is already registered'] },
      })
    }

    const user = await User.query().create({
      name: String(data.name).trim(),
      email,
      password: await Hash.make(String(data.password)),
    })

    const auth = Auth.make().setRequest(this.ctx.req as never)
    const pat = await auth.create(user as never)

    return this.respond(
      { user: serializeUser(user), token: pat.token, expiresAt: pat.expiresAt ?? null },
      'Welcome to Toneflix Photos',
      201,
    )
  }

  async login() {
    const data = await this.validate({
      email: 'required|email',
      password: 'required|string',
    })

    const auth = Auth.make().setRequest(this.ctx.req as never)
    const pat = await auth.login(String(data.email).trim().toLowerCase(), String(data.password))
    const user = await User.query().find(pat.userId as never)

    return this.respond(
      { user: serializeUser(user as User), token: pat.token, expiresAt: pat.expiresAt ?? null },
      'Signed in',
    )
  }

  async me() {
    return this.respond(serializeUser(this.user))
  }

  async logout() {
    const req = this.ctx.req as any
    await Auth.make()
      .setRequest(req)
      .logout(req.authToken as string)

    return this.respond(null, 'Signed out')
  }
}
