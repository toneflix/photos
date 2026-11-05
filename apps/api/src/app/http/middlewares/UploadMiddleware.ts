import type { NextFunction, Request, Response } from 'express'
import { FormDataMiddleware } from '@arkstack/driver-express/middlewares'
import { RequestException } from '@arkstack/common'

/**
 * Parses multipart uploads with hard limits, refusing oversized requests while they
 * stream in and answering with a 413 the client can show.
 */
export class UploadMiddleware {
  static readonly MAX_FILE_BYTES = 25 * 1024 * 1024

  static readonly MESSAGES: Record<string, string> = {
    LIMIT_FILE_SIZE: `Files can be up to ${UploadMiddleware.MAX_FILE_BYTES / 1024 / 1024} MB.`,
    LIMIT_FILE_COUNT: 'Send one file at a time.',
  }

  private readonly parser = new FormDataMiddleware('any', {
    limits: { fileSize: UploadMiddleware.MAX_FILE_BYTES, files: 1, fields: 20, fieldSize: 64 * 1024 },
  })

  handler(req: Request, res: Response, next: NextFunction) {
    return this.parser.handler(req, res, (error?: any) => {
      if (error?.name !== 'MulterError') return next(error)

      next(new RequestException(UploadMiddleware.MESSAGES[error.code] ?? 'This upload is too large.', 413))
    })
  }
}
