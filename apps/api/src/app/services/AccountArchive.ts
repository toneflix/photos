import type { Zip } from 'fflate'
import { Book } from '@app/models/Book'
import { Photo } from '@app/models/Photo'
import { Space } from '@app/models/Space'
import { Storage } from '@arkstack/filesystem'
import type { User } from '@app/models/User'
import { ZipArchive } from './ZipArchive'

/**
 * Everything a user has stored, as a zip streamed straight to the response:
 * `account.json`, `books.json`, `photos.json` and every original photo file.
 */
export class AccountArchive extends ZipArchive {
  constructor(private readonly user: User) {
    super()
  }

  filename(): string {
    return `toneflix-photos-${new Date().toISOString().slice(0, 10)}.zip`
  }

  protected async write(zip: Zip) {
    const photos = (await Photo.query().where({ userId: this.user.id }).oldest('createdAt').get()).all()
    const books = (await Book.query().where({ userId: this.user.id }).oldest('createdAt').get()).all()
    const spaces = (await Space.query().where({ userId: this.user.id }).oldest('createdAt').get()).all()
    const files = new Map(photos.map((photo) => [photo.id, `photos/${photo.id}${photo.path.slice(photo.path.lastIndexOf('.'))}`]))

    this.addJson(zip, 'account.json', {
      name: this.user.name,
      email: this.user.email,
      emailVerified: this.user.hasVerifiedEmail(),
      defaultVisibility: this.user.defaultVisibility,
      showOwnerName: this.user.showOwnerName,
      defaultLicense: this.user.defaultLicense,
      createdAt: this.user.createdAt,
      exportedAt: new Date(),
    })

    this.addJson(
      zip,
      'spaces.json',
      spaces.map((space) => ({
        id: space.id,
        name: space.name,
        slug: space.slug,
        description: space.description,
        visibility: space.visibility,
        createdAt: space.createdAt,
      })),
    )

    this.addJson(
      zip,
      'photos.json',
      photos.map((photo) => ({
        id: photo.id,
        spaceId: photo.spaceId,
        file: files.get(photo.id),
        originalName: photo.originalName,
        mimeType: photo.mimeType,
        size: photo.size,
        width: photo.width,
        height: photo.height,
        caption: photo.caption,
        license: photo.license,
        takenAt: photo.takenAt,
        uploadedAt: photo.createdAt,
      })),
    )

    const bookData = []

    for (const book of books) {
      const pages = await book.orderedPages()

      bookData.push({
        id: book.id,
        spaceId: book.spaceId,
        title: book.title,
        description: book.description,
        visibility: book.visibility,
        theme: book.theme,
        coverDesign: book.coverDesign,
        coverText: book.coverText,
        paper: book.paper,
        frame: book.frame,
        cover: book.coverPhotoId ? (files.get(book.coverPhotoId) ?? null) : null,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
        pages: pages.map((page) => ({
          layout: page.layout,
          frame: page.frame,
          caption: page.caption,
          photos: page.placements().flatMap(({ id, frame }) => (files.has(id) ? [{ file: files.get(id), frame }] : [])),
        })),
      })
    }

    this.addJson(zip, 'books.json', bookData)

    for (const photo of photos) {
      const bytes = await Storage.disk(photo.disk as never)
        .getBytes(photo.path)
        .catch(() => null)

      if (bytes) this.addFile(zip, files.get(photo.id)!, bytes)
    }
  }
}
