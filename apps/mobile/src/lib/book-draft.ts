import { PAGE_LAYOUTS, PhotoCrop, type BookPageInput, type BookWithPages, type FrameStyle, type PageLayout, type Photo, type PhotoPosition } from '@photos/types'

/**
 * A photo on a page, with its own frame once one is picked (null or missing follows the page's) and its
 * position once moved (null or missing is centred).
 */
export type DraftPhoto = Photo & { frame?: FrameStyle | null; position?: PhotoPosition | null }

export interface DraftPage {
  key: string
  layout: PageLayout
  /** Null follows the book's frame. */
  frame: FrameStyle | null
  caption: string
  photos: DraftPhoto[]
}

let sequence = 0
const newKey = () => `p${Date.now().toString(36)}${(sequence++).toString(36)}`

/** Layouts used, in turn, when every unused photo gets a page. */
const MIX: PageLayout[] = ['single', 'framed', 'pair', 'collage', 'framed', 'grid']

/** The pages of a book being edited. Every change returns a new draft, so it can live in React state. */
export class BookDraft {
  constructor(readonly pages: DraftPage[] = []) {}

  static from(book: BookWithPages) {
    return new BookDraft(book.pages.map((page) => ({ key: page.id, layout: page.layout, frame: page.frame ?? null, caption: page.caption ?? '', photos: page.photos })))
  }

  get length() {
    return this.pages.length
  }

  /** Ids of every photo already on a page. */
  get usedIds() {
    return new Set(this.pages.flatMap((page) => page.photos.map((photo) => photo.id)))
  }

  /** Every photo on the pages, once each, in page order. */
  get photos() {
    return [...new Map(this.pages.flatMap((page) => page.photos).map((photo) => [photo.id, photo])).values()]
  }

  /** What the API's save-pages call takes. */
  toInput(): BookPageInput[] {
    return this.pages.map((page) => ({
      layout: page.layout,
      frame: page.frame,
      caption: page.caption || null,
      photoIds: page.photos.map((photo) => photo.id),
      photoFrames: page.photos.map((photo) => photo.frame ?? null),
      photoPositions: page.photos.map((photo) => photo.position ?? null),
    }))
  }

  insert(at: number, layout: PageLayout = 'framed', photos: Photo[] = []) {
    const pages = [...this.pages]

    pages.splice(at, 0, { key: newKey(), layout, frame: null, caption: '', photos })

    return new BookDraft(pages)
  }

  remove(index: number) {
    return new BookDraft(this.pages.filter((_, i) => i !== index))
  }

  move(from: number, to: number) {
    if (from === to || to < 0 || to >= this.pages.length) return this

    const pages = [...this.pages]
    const [page] = pages.splice(from, 1)

    pages.splice(to, 0, page)

    return new BookDraft(pages)
  }

  update(index: number, changes: Partial<Omit<DraftPage, 'key'>>) {
    return new BookDraft(this.pages.map((page, i) => (i === index ? { ...page, ...changes } : page)))
  }

  /** Switch a page's layout, keeping the photos that still fit. */
  layout(index: number, layout: PageLayout) {
    const page = this.pages[index]

    return page ? this.update(index, { layout, photos: page.photos.slice(0, PAGE_LAYOUTS[layout].slots) }) : this
  }

  /** Put a photo in a slot (or the next free one) and return the slot it went in, or null when the page holds no photos. */
  place(index: number, photo: Photo, slot: number | null): { draft: BookDraft; slot: number | null } {
    const page = this.pages[index]
    const max = page ? PAGE_LAYOUTS[page.layout].slots : 0

    if (!page || max === 0) return { draft: this, slot: null }

    const target = slot !== null && slot < max ? slot : Math.min(page.photos.length, max - 1)
    const photos = [...page.photos]

    if (target >= photos.length) photos.push(photo)
    else photos[target] = photo

    return { draft: this.update(index, { photos: photos.slice(0, max) }), slot: target }
  }

  removePhoto(index: number, slot: number) {
    const page = this.pages[index]

    return page ? this.update(index, { photos: page.photos.filter((_, i) => i !== slot) }) : this
  }

  /** Give the photo in a slot its own frame, or null to follow the page's. */
  photoFrame(index: number, slot: number, frame: FrameStyle | null) {
    const page = this.pages[index]

    return page ? this.update(index, { photos: page.photos.map((photo, i) => (i === slot ? { ...photo, frame } : photo)) }) : this
  }

  /** Choose which part of the photo in a slot shows. Null centres it. */
  photoPosition(index: number, slot: number, position: PhotoPosition | null) {
    const page = this.pages[index]
    const crop = PhotoCrop.of(position)
    const stored = crop.isCentred ? null : crop.toJSON()

    return page ? this.update(index, { photos: page.photos.map((photo, i) => (i === slot ? { ...photo, position: stored } : photo)) }) : this
  }

  /** Make every page follow the book's frame. */
  followBookFrame() {
    return new BookDraft(this.pages.map((page) => ({ ...page, frame: null })))
  }

  /** Give every photo not in the book yet a page of its own, mixing layouts. */
  addUnused(library: Photo[]) {
    const used = this.usedIds
    const unused = library.filter((photo) => !used.has(photo.id))
    const added: DraftPage[] = []

    for (let i = 0, n = 0; i < unused.length; n++) {
      const layout = MIX[n % MIX.length]
      const count = PAGE_LAYOUTS[layout].slots

      added.push({ key: newKey(), layout, frame: null, caption: '', photos: unused.slice(i, i + count) })
      i += count
    }

    return new BookDraft([...this.pages, ...added])
  }
}
