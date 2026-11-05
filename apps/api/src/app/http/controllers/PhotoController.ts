import { ACCEPTED_MIME_TYPES, deletePhotoFile, storePhoto } from '@app/support/media'

import { BaseController } from './BaseController'
import { Book } from '@app/models/Book'
import { BookPage } from '@app/models/BookPage'
import { Photo } from '@app/models/Photo'
import { serializePhoto } from '@app/support/serializers'

/** 25 MB per photo. */
const MAX_PHOTO_BYTES = 25 * 1024 * 1024

const toInt = (value: unknown) => {
  const n = Number.parseInt(String(value ?? ''), 10)
  
return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * The signed-in user's photo library.
 */
export default class PhotoController extends BaseController {
  async index() {
    const { page, perPage } = this.pagination(60, 200)
    const where = { userId: this.user.id }

    const total = await Photo.query().where(where).count()
    const photos = (
      await Photo.query()
        .where(where)
        .latest('createdAt')
        .skip((page - 1) * perPage)
        .take(perPage)
        .get()
    ).all()

    return this.respondPaginated(await Promise.all(photos.map(serializePhoto)), total, page, perPage)
  }

  async store() {
    const files = ((this.ctx.req as any).files ?? []) as Array<{
      fieldname: string
      originalname: string
      mimetype: string
      size: number
      buffer: Buffer
    }>
    const file = files.find((f) => f.fieldname === 'photo')

    if (!file) return this.invalid('photo', 'Choose a photo to upload')
    if (!ACCEPTED_MIME_TYPES.includes(file.mimetype))
      return this.invalid('photo', 'Photos must be JPEG, PNG, WebP, GIF, AVIF or HEIC images')
    if (file.size > MAX_PHOTO_BYTES) return this.invalid('photo', 'Photos can be up to 25 MB')

    const stored = await storePhoto(this.user.id, file)
    const takenAt = this.body.takenAt ? new Date(String(this.body.takenAt)) : null

    const photo = await Photo.query().create({
      userId: this.user.id,
      disk: stored.disk,
      path: stored.path,
      originalName: file.originalname?.slice(0, 255) || null,
      mimeType: file.mimetype,
      size: file.size,
      width: toInt(this.body.width),
      height: toInt(this.body.height),
      caption: this.body.caption ? String(this.body.caption).slice(0, 2000) : null,
      takenAt: takenAt && !Number.isNaN(takenAt.getTime()) ? takenAt : null,
    })

    return this.respond(await serializePhoto(photo), 'Photo uploaded', 201)
  }

  async show() {
    return this.respond(await serializePhoto(await this.findOwned()))
  }

  async update() {
    const photo = await this.findOwned()
    const data = await this.validate({
      caption: 'nullable|string|max:2000',
      takenAt: 'nullable|string',
    })

    const changes: Record<string, unknown> = {}
    if ('caption' in this.body) changes.caption = data.caption || null
    if ('takenAt' in this.body) changes.takenAt = data.takenAt ? new Date(data.takenAt) : null

    if (Object.keys(changes).length) {
      await Photo.query().where({ id: photo.id }).update(changes)
    }

    const fresh = (await Photo.query().find(photo.id)) as Photo

    return this.respond(await serializePhoto(fresh), 'Photo updated')
  }

  async destroy() {
    const photo = await this.findOwned()

    // Take the photo out of every book it appears in.
    const books = (await Book.query().where({ userId: this.user.id }).get()).all()
    for (const book of books) {
      if (book.coverPhotoId === photo.id) {
        await Book.query().where({ id: book.id }).update({ coverPhotoId: null })
      }
      const pages = (await BookPage.query().where({ bookId: book.id }).get()).all()
      for (const page of pages) {
        if ((page.photoIds ?? []).includes(photo.id)) {
          await BookPage.query()
            .where({ id: page.id })
            .update({ photoIds: page.photoIds.filter((id) => id !== photo.id) })
        }
      }
    }

    await Photo.query().where({ id: photo.id }).delete()
    await deletePhotoFile(photo)

    return this.respond(null, 'Photo deleted')
  }

  private async findOwned(): Promise<Photo> {
    const photo = await Photo.query()
      .where({ id: String(this.params.id), userId: this.user.id })
      .first()
      .catch(() => null)

    return photo ?? this.notFound('Photo')
  }

  private invalid(field: string, message: string) {
    this.ctx.res.status(422).json({ status: 'error', message, code: 422, errors: { [field]: [message] } })
  }
}
