import { BaseController } from './BaseController'
import { Book } from '@app/models/Book'
import { Photo } from '@app/models/Photo'
import { PublicBookCollection } from '@app/http/resources/PublicBookCollection'
import { PublicPhotoCollection } from '@app/http/resources/PublicPhotoCollection'
import { PublicPhotoDetailResource } from '@app/http/resources/PublicPhotoDetailResource'
import { PublicSpaceCollection } from '@app/http/resources/PublicSpaceCollection'
import { PublicSpaceResource } from '@app/http/resources/PublicSpaceResource'
import { SORTS } from '@app/support/search'
import { downloadSize } from '@app/support/rules'
import { Space } from '@app/models/Space'
import { abortIf, perPage } from '@arkstack/common'
import { ContentStats } from '@app/services/ContentStats'

/**
 * The public timeline: photos, books and spaces their owners chose to show everyone.
 * Photo and book lists take a `space` web address to browse one space; owners can preview their private ones.
 * Nothing here needs an account.
 */
export default class ExploreController extends BaseController {
  async photos() {
    const filters = await this.validateQuery({
      q: 'nullable|string|max:100',
      orientation: `nullable|in:${Photo.ORIENTATIONS.join(',')}`,
      sort: `nullable|in:${SORTS.join(',')}`,
      space: 'nullable|string|max:60',
    })

    const space = filters.space ? await Space.browse(filters.space, await this.viewer()) : null
    const photos = await Photo.published({ ...filters, space: space?.id })
      .with(['user', 'space'])
      .paginate(perPage(this.query, { perPage: 40, maxPerPage: 100 }))

    return new PublicPhotoCollection(photos).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async photo() {
    const viewer = await this.viewer()
    const photo = await Photo.query()
      .where({ visibility: 'public' })
      .with(['user', 'space'])
      .findOrFail(String(this.params.photo))

    abortIf(!(await photo.isListedFor(viewer)), 'Photo not found!', 404)

    await new ContentStats(photo).view(this.visitor(viewer), viewer)

    return new PublicPhotoDetailResource(photo).for(viewer).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** The original, or a copy at a preset or custom size, only when the owner chose an open licence. */
  async download() {
    const viewer = await this.viewer()
    const photo = await Photo.query().where({ visibility: 'public' }).findOrFail(String(this.params.photo))

    abortIf(!(await photo.isListedFor(viewer)), 'Photo not found!', 404)
    abortIf(!photo.allowsDownload(), 'The photographer keeps all rights to this photo, so it cannot be downloaded.', 403)

    await new ContentStats(photo).download(this.visitor(viewer), viewer)

    return photo.download(await this.validateQuery(downloadSize(Object.keys(Photo.DOWNLOAD_SIZES))))
  }

  async books() {
    const filters = await this.validateQuery({
      q: 'nullable|string|max:100',
      theme: `nullable|in:${Book.THEMES.join(',')}`,
      sort: `nullable|in:${SORTS.join(',')}`,
      space: 'nullable|string|max:60',
    })

    const space = filters.space ? await Space.browse(filters.space, await this.viewer()) : null
    const books = await Book.published({ ...filters, space: space?.id })
      .with(['user', 'space'])
      .paginate(perPage(this.query, { perPage: 24, maxPerPage: 100 }))

    return new PublicBookCollection(books).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async spaces() {
    const filters = await this.validateQuery({
      q: 'nullable|string|max:100',
      sort: `nullable|in:${SORTS.join(',')}`,
    })

    const spaces = await Space.published(filters)
      .with('user')
      .paginate(perPage(this.query, { perPage: 24, maxPerPage: 100 }))

    return new PublicSpaceCollection(spaces).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** A space's page header. Private spaces open only for their owner. */
  async space() {
    const viewer = await this.viewer()
    const space = await Space.browse(String(this.params.space), viewer)

    await new ContentStats(space).view(this.visitor(viewer), viewer)

    return new PublicSpaceResource(space).for(viewer).additional({ status: 'success', message: 'OK', code: 200 })
  }
}
