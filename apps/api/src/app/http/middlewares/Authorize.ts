import type { NextFunction, Request, Response } from 'express'
import type { PermissionName } from '@app/policies/Permission'
import { RequestException } from '@arkstack/common'
import type { User } from '@app/models/User'

/**
 * Lets a request through only when the signed-in user's role grants at least one of
 * the given permissions. Goes after the `auth` middleware.
 */
export class Authorize {
  constructor(readonly permissions: PermissionName[]) {}

  static to(...permissions: PermissionName[]) {
    const middleware = new Authorize(permissions)

    return (req: Request, res: Response, next: NextFunction) => middleware.handler(req, res, next).catch(next)
  }

  async handler(req: Request, _res: Response, next: NextFunction) {
    const user = (req as any).user as User | undefined

    if (!user) return next(new RequestException('Unauthenticated.', 401))

    const granted = await user.permissions()

    if (!this.permissions.some((permission) => granted.includes(permission))) return next(new RequestException('You do not have access to this.', 403))

    next()
  }
}
