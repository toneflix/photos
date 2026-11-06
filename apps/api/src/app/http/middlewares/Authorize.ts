import type { NextFunction, Request, Response } from 'express'
import type { AdminPermission } from '@app/policies/Role'
import { RequestException } from '@arkstack/common'
import type { User } from '@app/models/User'

/**
 * Lets a request through only when the signed-in user's role grants a permission.
 * Goes after the `auth` middleware.
 */
export class Authorize {
  constructor(readonly permission: AdminPermission) {}

  static to(permission: AdminPermission) {
    const middleware = new Authorize(permission)

    return (req: Request, res: Response, next: NextFunction) => middleware.handler(req, res, next)
  }

  handler(req: Request, _res: Response, next: NextFunction) {
    const user = (req as any).user as User | undefined

    if (!user) return next(new RequestException('Unauthenticated.', 401))
    if (!user.can(this.permission)) return next(new RequestException('You do not have access to this.', 403))

    next()
  }
}
