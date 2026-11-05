import { Book } from './Book'
import { Model } from '@arkstack/database'

/** A photo in a page slot, with its own frame or null to use the page's. */
export interface Placement {
  id: string
  frame: string | null
}

export class BookPage extends Model {
  declare id: string
  declare bookId: string
  declare position: number
  declare layout: string
  /** Null when the page uses the book's frame. */
  declare frame: string | null
  declare caption: string | null
  declare photoIds: string[]
  /** Each photo's own frame, in `photoIds` order. */
  declare photoFrames: (string | null)[] | null
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'book_pages'

  protected static override columns = {
    bookId: 'book_id',
    photoIds: 'photo_ids',
    photoFrames: 'photo_frames',
  }

  protected override casts = {
    photoIds: 'json',
    photoFrames: 'json',
  } as never

  /** The columns that store photos in slot order. */
  static place(placements: Placement[]) {
    return { photoIds: placements.map(({ id }) => id), photoFrames: placements.map(({ frame }) => frame) }
  }

  book() {
    return this.belongsTo(Book, 'bookId')
  }

  /** Photos in slot order with their frames. */
  placements(): Placement[] {
    return (this.photoIds ?? []).map((id, slot) => ({ id, frame: this.photoFrames?.[slot] ?? null }))
  }
}
