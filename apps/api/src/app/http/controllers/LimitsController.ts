import { BaseController } from './BaseController'
import { GenericResource } from 'resora'
import { Settings } from '@app/support/Settings'
import { Limits } from '@app/policies/Limits'

/** Limits apps check before sending anything, so people hear about them early. Signed in, they follow the account's plan. */
export default class LimitsController extends BaseController {
  async show() {
    const limits = await Limits.for(await this.viewer())
    const branding = await Limits.defaultBranding()

    return new GenericResource({
      maxPhotoMb: (await limits.photoKb()) / 1024,
      maxAvatarMb: await Settings.number('uploads.max_avatar_mb'),
      maxBookPages: await limits.get('max_book_pages'),
      registrationOpen: Boolean(await Settings.get('accounts.registration_open')),
      bookKicker: branding.kicker,
      bookImprint: branding.imprint,
      pageShapes: await limits.designs('shape'),
    }).additional({ status: 'success', message: 'OK', code: 200 })
  }
}
