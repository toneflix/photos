import { User as BaseUser } from '@arkstack/auth'
import { Book } from './Book'
import { Photo } from './Photo'
import { PersonalAccessToken } from './PersonalAccessToken'
import { UserNotification } from './UserNotification'
import { UserTwoFactor } from './UserTwoFactor'
import { UserFactory } from 'src/database/factories/UserFactory'

export class User extends BaseUser {
  declare email: string
  declare password: string
  declare name: string
  declare createdAt: Date
  declare updatedAt: Date

  protected static override factoryClass = UserFactory

  protected override hidden = ['password']

  books() {
    return this.hasMany(Book, 'userId')
  }

  photos() {
    return this.hasMany(Photo, 'userId')
  }

  personalAccessTokens() {
    return this.hasMany(PersonalAccessToken, 'userId')
  }

  twoFactor() {
    return this.hasOne(UserTwoFactor, 'userId')
  }

  notifications() {
    return this.hasMany(UserNotification, 'userId')
  }
}
