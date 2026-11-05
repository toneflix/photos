import type { FlipbookBook, FlipbookPage, FlipbookPhoto } from '@toneflix/flipbook-core'
import type { Book, BookPage, BookPagePhoto, BookWithPages, Photo } from './models'

type PageLike = Pick<BookPage, 'layout' | 'frame' | 'caption'> & { photos: (Photo | BookPagePhoto | null)[] }

/** Turns books from the API into the flipbook library's model, so every app prints them the same way. */
export class FlipbookModel {
  static photo(photo: Photo | BookPagePhoto | null | undefined): FlipbookPhoto | null {
    if (!photo) return null

    return {
      src: photo.url,
      alt: photo.caption,
      width: photo.width,
      height: photo.height,
      frame: 'frame' in photo ? photo.frame : null,
    }
  }

  static page(page: PageLike): FlipbookPage {
    return { layout: page.layout, frame: page.frame, caption: page.caption || null, photos: page.photos.map(FlipbookModel.photo) }
  }

  /** The front cover's look, for shelves and pickers that show a book without its pages. */
  static cover(book: Pick<Book, 'title' | 'description' | 'theme' | 'coverDesign' | 'coverText' | 'coverPhoto'>) {
    return {
      title: book.title,
      subtitle: book.description,
      cover: FlipbookModel.photo(book.coverPhoto),
      theme: book.theme,
      coverDesign: book.coverDesign,
      coverText: book.coverText ?? undefined,
      kicker: 'A Toneflix photo book',
    } satisfies Partial<FlipbookBook>
  }

  static book(book: BookWithPages): FlipbookBook {
    return {
      ...FlipbookModel.cover(book),
      author: book.owner.name || null,
      year: new Date(book.createdAt).getFullYear(),
      paper: book.paper,
      frame: book.frame,
      pages: book.pages.map(FlipbookModel.page),
      colophon: 'Preserved for all time with Toneflix Photos.',
      imprint: 'Toneflix Photos',
    }
  }
}
