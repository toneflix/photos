import type {
  Book as BookData,
  BookPage as BookPageData,
  BookTheme,
  BookWithPages,
  PageLayout,
  Photo as PhotoData,
  User as UserData,
} from '@photos/types'

import { Book } from '@app/models/Book'
import { BookPage } from '@app/models/BookPage'
import { Photo } from '@app/models/Photo'
import { User } from '@app/models/User'
import { photoUrl } from './media'

const iso = (value: Date | string | null | undefined) =>
  value == null ? null : value instanceof Date ? value.toISOString() : new Date(value).toISOString()

export const serializeUser = (user: User): UserData => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: iso(user.createdAt)!,
  updatedAt: iso(user.updatedAt)!,
})

export const serializePhoto = async (photo: Photo): Promise<PhotoData> => {
  const url = await photoUrl(photo)

  return {
    id: photo.id,
    userId: photo.userId,
    url,
    thumbnailUrl: null,
    width: photo.width == null ? null : Number(photo.width),
    height: photo.height == null ? null : Number(photo.height),
    mimeType: photo.mimeType,
    size: Number(photo.size),
    caption: photo.caption ?? null,
    takenAt: iso(photo.takenAt),
    createdAt: iso(photo.createdAt)!,
    updatedAt: iso(photo.updatedAt)!,
  }
}

export const serializeBook = async (
  book: Book,
  extra: { pageCount: number; coverPhoto?: Photo | null },
): Promise<BookData> => ({
  id: book.id,
  userId: book.userId,
  title: book.title,
  description: book.description ?? null,
  coverPhotoId: book.coverPhotoId ?? null,
  coverPhoto: extra.coverPhoto ? await serializePhoto(extra.coverPhoto) : null,
  visibility: book.visibility,
  theme: (book.theme ?? 'classic') as BookTheme,
  pageCount: extra.pageCount,
  createdAt: iso(book.createdAt)!,
  updatedAt: iso(book.updatedAt)!,
})

export const serializePage = (page: BookPage, photos: Map<string, PhotoData>): BookPageData => ({
  id: page.id,
  bookId: page.bookId,
  position: Number(page.position),
  layout: page.layout as PageLayout,
  caption: page.caption ?? null,
  photos: (page.photoIds ?? []).map((id) => photos.get(id)).filter((p): p is PhotoData => !!p),
})

export const serializeBookWithPages = async (
  book: Book,
  pages: BookPage[],
  photos: Photo[],
  owner: User | null,
  canEdit: boolean,
): Promise<BookWithPages> => {
  const photoMap = new Map<string, PhotoData>()
  for (const photo of photos) photoMap.set(photo.id, await serializePhoto(photo))

  const cover = book.coverPhotoId ? (photos.find((p) => p.id === book.coverPhotoId) ?? null) : null

  return {
    ...(await serializeBook(book, { pageCount: pages.length, coverPhoto: cover })),
    pages: pages.map((page) => serializePage(page, photoMap)),
    canEdit,
    owner: { id: owner?.id ?? book.userId, name: owner?.name ?? '' },
  }
}
