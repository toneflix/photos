import '@arkstack/database/setup'
import '@arkstack/http/setup'
import '@arkstack/auth/setup'
import '@arkstack/queue/setup'
import '@arkstack/cache/setup'
import '@arkstack/lang/setup'

import * as express from 'express'

import Application from '../core/app'
import { Arkorm } from 'arkormx'
import { Validator } from 'kanun'
import { View } from '@arkstack/view'
import { fileValidatorPlugin } from '@kanun-hq/plugin-file'
import { importFile, interopDefault, resolveRuntimeModule } from '@arkstack/common'

// Packages that look models up by name, like auth's `User`, get the classes the routes use.
const models = await importFile<typeof import('../app/models')>(resolveRuntimeModule('src/app/models/index.ts'))

Arkorm.registerModels(...Object.values(models))

View.boot()
Validator.use(fileValidatorPlugin)

const expressApp = interopDefault(express)()
export const app = new Application(expressApp)
