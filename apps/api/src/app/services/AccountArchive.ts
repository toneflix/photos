import { Zip, ZipPassThrough, strToU8 } from 'fflate'
import { Book } from '@app/models/Book'
import { Photo } from '@app/models/Photo'
import { Space } from '@app/models/Space'
import { Storage } from '@arkstack/filesystem'
import type { User } from '@app/models/User'

/**
 * Everything a user has stored, as a zip streamed straight to the response:
 * `account.json`, `books.json`, `photos.json` and every original photo file.
 */
export class AccountArchive {
  constructor(private readonly user: User) {}

  filename(): string {
    return `toneflix-photos-${new Date().toISOString().slice(0, 10)}.zip`
  }

  response(): Response {
    return new Response(this.stream(), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${this.filename()}"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  stream(): ReadableStream<Uint8Array> {
    return new ReadableStream({
      start: async (controller) => {
        const zip = new Zip((error, chunk, final) => {
          if (error) return controller.error(error)

          controller.enqueue(chunk)

          if (final) controller.close()
        })

        try {
          await this.write(zip)
          zip.end()
        } catch (error) {
          zip.terminate()
          controller.error(error)
        }
      },
    })
  }

  private async write(zip: Zip) {
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
        paper: book.paper,
        cover: book.coverPhotoId ? (files.get(book.coverPhotoId) ?? null) : null,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
        pages: pages.map((page) => ({
          layout: page.layout,
          caption: page.caption,
          photos: (page.photoIds ?? []).flatMap((id) => files.get(id) ?? []),
        })),
      })
    }

    this.addJson(zip, 'books.json', bookData)

    for (const photo of photos) {
      const bytes = await Storage.disk(photo.disk as never)
        .getBytes(photo.path)
        .catch(() => null)

      if (!bytes) continue

      const entry = new ZipPassThrough(files.get(photo.id)!)

      zip.add(entry)
      entry.push(bytes, true)
    }
  }

  private addJson(zip: Zip, name: string, value: unknown) {
    const entry = new ZipPassThrough(name)

    zip.add(entry)
    entry.push(strToU8(JSON.stringify(value, null, 2)), true)
  }
}
