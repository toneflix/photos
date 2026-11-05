import { BaseController } from './BaseController'
import { Book } from '@app/models/Book'
import { Photo } from '@app/models/Photo'
import { PublicBookCollection } from '@app/http/resources/PublicBookCollection'
import { PublicPhotoCollection } from '@app/http/resources/PublicPhotoCollection'
import { PublicPhotoDetailResource } from '@app/http/resources/PublicPhotoDetailResource'
import { perPage } from '@arkstack/common'

/**
 * The public timeline: photos and books their owners chose to show everyone.
 * Nothing here needs an account.
 */
export default class ExploreController extends BaseController {
  async photos() {
    const photos = await Photo.published()
      .with('user')
      .paginate(perPage(this.query, { perPage: 40, maxPerPage: 100 }))

    return new PublicPhotoCollection(photos).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async photo() {
    const photo = await Photo.query()
      .where({ visibility: 'public' })
      .with('user')
      .findOrFail(String(this.params.photo))

    return new PublicPhotoDetailResource(photo).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async books() {
    const books = await Book.published()
      .with('user')
      .paginate(perPage(this.query, { perPage: 24, maxPerPage: 100 }))

    return new PublicBookCollection(books).additional({ status: 'success', message: 'OK', code: 200 })
  }
}
