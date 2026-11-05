import type { FlipbookBook, FlipbookPage, FlipbookPhoto } from '@toneflix/flipbook-native'
import type { BookPage, BookWithPages, Photo } from '@photos/types'

type PageLike = Pick<BookPage, 'layout' | 'frame' | 'caption' | 'photos'>

/** Turns books from the API into the flipbook library's model, printed the way the web prints them. */
export class FlipbookModel {
  static photo(photo: Photo | null | undefined): FlipbookPhoto | null {
    if (!photo) return null

    return { src: photo.url, alt: photo.caption, width: photo.width, height: photo.height }
  }

  static page(page: PageLike): FlipbookPage {
    return { layout: page.layout, frame: page.frame, caption: page.caption || null, photos: page.photos.map(FlipbookModel.photo) }
  }

  static book(book: BookWithPages): FlipbookBook {
    return {
      title: book.title,
      subtitle: book.description,
      author: book.owner.name || null,
      year: new Date(book.createdAt).getFullYear(),
      cover: FlipbookModel.photo(book.coverPhoto),
      theme: book.theme,
      paper: book.paper,
      frame: book.frame,
      pages: book.pages.map(FlipbookModel.page),
      kicker: 'A Toneflix photo book',
      colophon: 'Preserved for all time with Toneflix Photos.',
      imprint: 'Toneflix Photos',
    }
  }
}
