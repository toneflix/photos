import { BaseController } from '../BaseController'
import { SettingGroupCollection } from '@app/http/resources/SettingGroupCollection'
import { SettingGroupResource } from '@app/http/resources/SettingGroupResource'
import { Settings } from '@app/support/Settings'

/** Admins change app settings, one group at a time. Secrets are not here; they stay in .env. */
export default class SettingsController extends BaseController {
  async index() {
    return new SettingGroupCollection(Settings.groups()).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async update() {
    const group = Settings.group(String(this.params.group))
    const data = await this.validate(Settings.rules(group))

    await Settings.update(group, data)

    return new SettingGroupResource(group).additional({ status: 'success', message: 'Settings saved', code: 200 })
  }
}
