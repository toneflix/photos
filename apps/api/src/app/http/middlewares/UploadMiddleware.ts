import type { NextFunction, Request, Response } from 'express'
import { FormDataMiddleware } from '@arkstack/driver-express/middlewares'
import { RequestException } from '@arkstack/common'
import { Settings } from '@app/support/Settings'
import { Limits } from '@app/policies/Limits'

/**
 * Parses multipart uploads with hard limits, refusing oversized requests while they
 * stream in and answering with a 413 the client can show. The file size limit is the
 * largest photo any plan accepts or the profile photo setting, whichever is bigger;
 * each upload is then checked against its own account's limit.
 */
export class UploadMiddleware {
  /** One parser per file size limit, so a changed setting takes effect without a restart. */
  private readonly parsers = new Map<number, FormDataMiddleware>()

  async handler(req: Request, res: Response, next: NextFunction) {
    if (!req.is('multipart/form-data')) return next()

    const maxMb = Math.max(await Limits.largestPhotoMb(), await Settings.number('uploads.max_avatar_mb'))
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: `Files can be up to ${maxMb} MB.`,
      LIMIT_FILE_COUNT: 'Send one file at a time.',
    }

    return this.parser(maxMb).handler(req, res, (error?: any) => {
      if (error?.name !== 'MulterError') return next(error)

      next(new RequestException(messages[error.code] ?? 'This upload is too large.', 413))
    })
  }

  private parser(maxMb: number): FormDataMiddleware {
    let parser = this.parsers.get(maxMb)

    if (!parser) {
      parser = new FormDataMiddleware('any', {
        limits: { fileSize: maxMb * 1024 * 1024, files: 1, fields: 20, fieldSize: 64 * 1024 },
      })
      this.parsers.set(maxMb, parser)
    }

    return parser
  }
}
