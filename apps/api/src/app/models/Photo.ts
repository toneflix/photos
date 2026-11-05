import { Model } from '@arkstack/database'
import { User } from './User'

export class Photo extends Model {
  declare id: string
  declare userId: string
  declare disk: string
  declare path: string
  declare originalName: string | null
  declare mimeType: string
  declare size: number
  declare width: number | null
  declare height: number | null
  declare caption: string | null
  declare takenAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'photos'

  protected static override columns = {
    userId: 'user_id',
    originalName: 'original_name',
    mimeType: 'mime_type',
    takenAt: 'taken_at',
  }

  user() {
    return this.belongsTo(User, 'userId')
  }
}
