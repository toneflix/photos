import { SORTS } from '@app/support/search'
import { perPage } from '@arkstack/common'
import { BaseController } from './BaseController'
import { Photo } from '@app/models/Photo'
import { PhotoCollection } from '@app/http/resources/PhotoCollection'
import { PhotoResource } from '@app/http/resources/PhotoResource'

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
    })

    const photos = await Photo.library(this.user, filters).paginate(perPage(this.query, { perPage: 60, maxPerPage: 200 }))

    return new PhotoCollection(photos).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async create() {
    const data = await this.validate({
      photo: `required|file|mimetypes:${Object.keys(Photo.EXTENSIONS).join(',')}|max:25600`,
      width: 'nullable|integer|min:1',
      height: 'nullable|integer|min:1',
      caption: 'nullable|string|max:2000',
      takenAt: 'nullable|date',
    })

    const photo = await Photo.upload(this.user, data.photo, {
      width: data.width ? Number(data.width) : null,
      height: data.height ? Number(data.height) : null,
      caption: data.caption || null,
      takenAt: data.takenAt || null,
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

  async update() {
    const photo = await this.user.photos().findOrFail(String(this.params.photo))
    const data = await this.validate({
      caption: 'nullable|string|max:2000',
      takenAt: 'nullable|date',
      visibility: `nullable|in:${Photo.VISIBILITIES.join(',')}`,
    })

    if (data.visibility) photo.setVisibility(data.visibility)
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
