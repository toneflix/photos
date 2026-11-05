import { BookPage } from './BookPage'
import { Model } from '@arkstack/database'
import { User } from './User'

export type BookVisibility = 'private' | 'shared' | 'public'

export class Book extends Model {
  declare id: string
  declare userId: string
  declare title: string
  declare description: string | null
  declare coverPhotoId: string | null
  declare visibility: BookVisibility
  declare theme: string
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'books'

  protected static override columns = {
    userId: 'user_id',
    coverPhotoId: 'cover_photo_id',
  }

  user() {
    return this.belongsTo(User, 'userId')
  }

  pages() {
    return this.hasMany(BookPage, 'bookId')
  }
}
