import { RulesForData, Validator } from 'kanun'

import { AuthenticationException } from '@arkstack/auth'
import { Controller } from 'clear-router'
import { HttpContext } from 'clear-router/types/express'
import type { User } from '@app/models/User'

export class BaseController extends Controller<HttpContext> {
  async validate<D extends Record<string, any>, R extends RulesForData<D>>(rules: R, camelizeKeys = false) {
    const data = await Validator.make(this.body, rules).validate()

    if (camelizeKeys) {
      return Object.keys(data).reduce(
        (result, key) => {
          result[str(key).camel().toString()] = data[key as never]

          return result
        },
        {} as Record<string, any>,
      ) as { [K in keyof R]: any }
    }

    return data as { [K in keyof R]: any }
  }

  /** Stop with a field error unless `password` is the signed-in user's password. */
  protected async confirmPassword(password: unknown, field = 'password') {
    if (await this.user.checkPassword(String(password))) return

    throw new AuthenticationException('Your password is not right', {
      req: this.ctx.req as never,
      status: 422,
      errors: { [field]: ['Your password is not right'] },
    })
  }

  /** The signed-in user. Only call this behind the `auth` middleware. */
  protected get user(): User {
    return (this.ctx.req as any).user as User
  }
}
