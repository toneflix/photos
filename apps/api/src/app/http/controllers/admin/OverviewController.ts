import { AdminOverview } from '@app/services/AdminOverview'
import { AdminOverviewResource } from '@app/http/resources/AdminOverviewResource'
import { BaseController } from '../BaseController'

/** The admin dashboard's front page. */
export default class OverviewController extends BaseController {
  async show() {
    const summary = await new AdminOverview().summary()

    return new AdminOverviewResource(summary).additional({ status: 'success', message: 'OK', code: 200 })
  }
}
