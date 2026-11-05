import { formdata, requestLogger, resora } from '@arkstack/driver-express/middlewares'

import { MiddlewareConfig } from '@arkstack/driver-express/types'
import cors from 'cors'
import { localeMiddleware } from '@arkstack/lang'
import corsConfig from './cors'
import express from 'express'
import { Arkstack } from '@arkstack/contract'
import path from 'node:path'
import { useExpressUploadContext } from '@kanun-hq/plugin-file'

export default (): MiddlewareConfig => {
  const cConf = corsConfig()

  return {
    global: [
      // Parse application/json
      express.json({
        verify: (req, _res, buffer) => {
          req.rawBody = Buffer.from(buffer)
        },
      }),
      express.urlencoded({ extended: true }),
      cors({
        origin: cConf.allowed_origins.length > 0 ? cConf.allowed_origins : true,
        credentials: true,
      }),
      formdata.any({ limits: { fileSize: 25 * 1024 * 1024, files: 1 } }),
      // Local disks sign photo URLs as APP_URL/<path>, so serve stored photos from there.
      express
        .Router()
        .use(
          '/photos',
          express.static(path.join(Arkstack.rootDir(), 'storage/app/public/photos'), {
            immutable: true,
            maxAge: '365d',
            fallthrough: false,
          }),
        ),
    ],
    before: [
      resora(),
      localeMiddleware(),
      (req, _res, next) => {
        useExpressUploadContext(req as never)
        next()
      },
    ],
    after: [requestLogger()],
  }
}
