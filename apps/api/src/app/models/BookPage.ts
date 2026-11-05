import { Book } from './Book'
import { Model } from '@arkstack/database'

export class BookPage extends Model {
  declare id: string
  declare bookId: string
  declare position: number
  declare layout: string
  declare caption: string | null
  declare photoIds: string[]
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'book_pages'

  protected static override columns = {
    bookId: 'book_id',
    photoIds: 'photo_ids',
  }

  protected override casts = {
    photoIds: 'json',
  } as never

  book() {
    return this.belongsTo(Book, 'bookId')
  }
}
