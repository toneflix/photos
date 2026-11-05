import { AccessTokenResource } from '@app/http/resources/AccessTokenResource'
import { Auth } from '@arkstack/auth'
import { BaseController } from './BaseController'
import { Hash } from '@arkstack/common'
import { User } from '@app/models/User'
import { UserResource } from '@app/http/resources/UserResource'

/**
 * Sign up, sign in and sign out with bearer tokens (personal access tokens).
 */
export default class AuthController extends BaseController {
  async register() {
    const data = await this.validate({
      name: 'required|string|max:120',
      email: 'required|email|max:191|unique:users,email',
      password: 'required|string|min:8|max:191',
    })

    const user = await User.query().create({
      name: String(data.name).trim(),
      email: String(data.email).trim().toLowerCase(),
      password: await Hash.make(String(data.password)),
    })

    const token = await Auth.make()
      .setRequest(this.ctx.req as never)
      .create(user as never)

    return new AccessTokenResource({ user, token })
      .additional({ status: 'success', message: 'Welcome to Toneflix Photos', code: 201 })
      .response()
      .setStatusCode(201)
  }

  async login() {
    const data = await this.validate({
      email: 'required|email',
      password: 'required|string',
    })

    const token = await Auth.make()
      .setRequest(this.ctx.req as never)
      .login(String(data.email).trim().toLowerCase(), String(data.password))

    const user = await User.query().findOrFail(token.userId as never)

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
}
