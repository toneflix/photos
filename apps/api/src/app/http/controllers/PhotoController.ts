import { SORTS } from '@app/support/search'
import { UUID, downloadSize, photoFile } from '@app/support/rules'
import { perPage } from '@arkstack/common'
import { BaseController } from './BaseController'
import { Photo } from '@app/models/Photo'
import { PhotoCollection } from '@app/http/resources/PhotoCollection'
import { PhotoResource } from '@app/http/resources/PhotoResource'
import { Limits } from '@app/policies/Limits'
import { SpaceAccess } from '@app/policies/SpaceAccess'

/**
 * The signed-in user's photo library.
 */
export default class PhotoController extends BaseController {
  async index() {
    const filters = await this.validateQuery({
      q: 'nullable|string|max:100',
      orientation: `nullable|in:${Photo.ORIENTATIONS.join(',')}`,
      visibility: `nullable|in:${Photo.VISIBILITIES.join(',')}`,
      sort: `nullable|in:${SORTS.join(',')}`,
      space: ['nullable', UUID],
    })

    const photos = await this.user.photos().scope('library', filters).paginate(perPage(this.query, { perPage: 60, maxPerPage: 200 }))

    return new PhotoCollection(photos).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async create() {
    const limits = await Limits.for(this.user)
    const data = await this.validate({
      photo: photoFile(await limits.photoKb()),
      width: 'nullable|integer|min:1',
      height: 'nullable|integer|min:1',
      caption: 'nullable|string|max:2000',
      takenAt: 'nullable|date',
      spaceId: ['nullable', UUID],
      license: `nullable|in:${Photo.LICENSES.join(',')}`,
    })

    await limits.ensureRoomFor(Math.min(data.photo.size, await Photo.maxOriginalBytes()))

    const space = data.spaceId ? (await SpaceAccess.find(data.spaceId, this.user)).authorize('create').space : null
    const photo = await Photo.upload(this.user, data.photo, {
      spaceId: space?.id ?? null,
      width: data.width ? Number(data.width) : null,
      height: data.height ? Number(data.height) : null,
      caption: data.caption || null,
      takenAt: data.takenAt || null,
      license: data.license || null,
    })

    return new PhotoResource(photo)
      .additional({ status: 'success', message: 'Photo uploaded', code: 201 })
      .response()
      .setStatusCode(201)
  }

  async show() {
    const photo = await this.user.photos().findOrFail(String(this.params.photo))

    return new PhotoResource(photo).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** The owner's photo at a preset or custom size, whatever its licence. Full size needs a plan with original downloads. */
  async download() {
    const photo = await this.user.photos().findOrFail(String(this.params.photo))
    const size = await this.validateQuery(downloadSize(Object.keys(Photo.DOWNLOAD_SIZES)))

    await (await Limits.for(this.user)).ensureDownloadSize(size)

    return photo.download(size)
  }

  async update() {
    const photo = await this.user.photos().findOrFail(String(this.params.photo))
    const data = await this.validate({
      caption: 'nullable|string|max:2000',
      takenAt: 'nullable|date',
      visibility: `nullable|in:${Photo.VISIBILITIES.join(',')}`,
      spaceId: ['nullable', UUID],
      license: `nullable|in:${Photo.LICENSES.join(',')}`,
    })

    if ('spaceId' in data) photo.spaceId = data.spaceId ? (await SpaceAccess.find(data.spaceId, this.user)).authorize('create').space.id : null
    if (data.visibility) photo.setVisibility(data.visibility)
    if (data.license) photo.license = data.license
    if ('caption' in data) photo.caption = data.caption || null
    if ('takenAt' in data) photo.takenAt = data.takenAt ? new Date(data.takenAt) : null

    await photo.save()

    return new PhotoResource(photo).additional({ status: 'success', message: 'Photo updated', code: 200 })
  }

  async destroy() {
    const photo = await this.user.photos().findOrFail(String(this.params.photo))

    await photo.remove()

    return new PhotoResource(photo).additional({ status: 'success', message: 'Photo deleted', code: 200 })
  }
}
