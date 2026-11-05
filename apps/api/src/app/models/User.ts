import { Auth, User as BaseUser } from '@arkstack/auth'
import { Book, type BookVisibility } from './Book'
import { Hash } from '@arkstack/common'
import { Photo, type PhotoLicense, type UploadedPhoto } from './Photo'
import { PasswordReset } from './PasswordReset'
import { PersonalAccessToken } from './PersonalAccessToken'
import { Space } from './Space'
import { Storage } from '@arkstack/filesystem'
import { UserNotification } from './UserNotification'
import { UserTwoFactor } from './UserTwoFactor'
import { UserFactory } from 'src/database/factories/UserFactory'
import { AccountMail } from '@app/notifications/AccountMail'
import { ImageFile } from '@app/support/ImageFile'
import { BookPage } from './BookPage'
import { randomUUID } from 'node:crypto'

export interface UserPreferences {
  defaultVisibility?: BookVisibility
  showOwnerName?: boolean
  defaultLicense?: PhotoLicense
}

export class User extends BaseUser {
  declare email: string
  declare password: string
  declare name: string
  declare emailVerifiedAt: Date | null
  declare avatarPath: string | null
  declare avatarDisk: string | null
  declare defaultVisibility: BookVisibility
  declare showOwnerName: boolean
  declare defaultLicense: PhotoLicense
  declare createdAt: Date
  declare updatedAt: Date

  /** The largest profile photo upload, in kilobytes. */
  static readonly AVATAR_MAX_KILOBYTES = 10_240

  protected static override factoryClass = UserFactory

  protected static override columns = {
    emailVerifiedAt: 'email_verified_at',
    avatarPath: 'avatar_path',
    avatarDisk: 'avatar_disk',
    defaultVisibility: 'default_visibility',
    showOwnerName: 'show_owner_name',
    defaultLicense: 'default_license',
  }

  protected override casts = {
    showOwnerName: 'boolean',
  } as never

  protected override hidden = ['password']

  /** The stored form of an email address: trimmed and lower case. Anything else is returned as given for validation to reject. */
  static normalizeEmail<T>(value: T): T | string {
    return typeof value === 'string' ? value.trim().toLowerCase() : value
  }

  books() {
    return this.hasMany(Book, 'userId')
  }

  photos() {
    return this.hasMany(Photo, 'userId')
  }

  spaces() {
    return this.hasMany(Space, 'userId')
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

  checkPassword(password: string): Promise<boolean> {
    return Hash.verify(password, this.password)
  }

  hasVerifiedEmail(): boolean {
    return !!this.emailVerifiedAt
  }

  /** Email a link that proves this user owns their current address. */
  async sendVerificationEmail(): Promise<void> {
    const token = await Auth.make().createTemporaryToken(this as never, `verify-email:${this.email}`, '24h')
    const query = new URLSearchParams({ token, email: this.email })

    await AccountMail.verifyEmail(this, `${config('app.frontend_url')}/verify-email?${query}`)
  }

  /** The user a verification link was sent to, while the link is valid and the address unchanged. */
  static async fromVerificationToken(token: string, email: string): Promise<User | null> {
    const user = (await Auth.make()
      .authorizeTemporaryToken(token, `verify-email:${email}`)
      .catch(() => null)) as User | null

    return user?.email === email ? user : null
  }

  async markEmailVerified(): Promise<void> {
    if (this.hasVerifiedEmail()) return

    await this.update({ emailVerifiedAt: new Date() })
  }

  /** Move the account to a new address, which then needs verifying again. */
  async changeEmail(email: string): Promise<void> {
    const previous = this.email

    await this.update({ email, emailVerifiedAt: null })

    await AccountMail.emailChanged(this, previous).catch(() => undefined)
    await this.sendVerificationEmail()
  }

  /** Set a new password and sign out every session except `keepToken`. */
  async changePassword(password: string, keepToken?: string | null): Promise<void> {
    await this.update({ password: await Hash.make(password) })
    await this.signOutOtherSessions(keepToken)
    await PasswordReset.query().where({ email: this.email }).delete()

    await AccountMail.passwordChanged(this).catch(() => undefined)
  }

  /** Revoke every access token but `keepToken`. Returns how many were revoked. */
  async signOutOtherSessions(keepToken?: string | null): Promise<number> {
    const sessions = (await PersonalAccessToken.query().where({ userId: this.id }).get()).all().filter((session) => session.token !== keepToken)

    for (const session of sessions) await session.delete()

    return sessions.length
  }

  async updatePreferences(preferences: UserPreferences): Promise<void> {
    await this.update(Object.fromEntries(Object.entries(preferences).filter(([, value]) => value !== undefined)))
  }

  /** Signed URL of the profile photo. Only its path is stored. */
  async avatarUrl(): Promise<string | null> {
    if (!this.avatarPath || !this.avatarDisk) return null

    return Storage.disk(this.avatarDisk as never).getSignedUrl(this.avatarPath, { expiresIn: '6h' })
  }

  async setAvatar(file: UploadedPhoto): Promise<void> {
    const disk = Photo.disk()
    const mimeType = ImageFile.read(file.buffer)?.mimeType ?? file.mimetype
    const path = `avatars/${this.id}/${randomUUID()}.${Photo.EXTENSIONS[mimeType] ?? 'bin'}`

    await Storage.disk(disk as never).put(path, new Uint8Array(file.buffer))
    await this.removeAvatar()
    await this.update({ avatarPath: path, avatarDisk: disk })
  }

  async removeAvatar(): Promise<void> {
    if (!this.avatarPath || !this.avatarDisk) return

    await Storage.disk(this.avatarDisk as never)
      .delete(this.avatarPath)
      .catch(() => undefined)
    await this.update({ avatarPath: null, avatarDisk: null })
  }

  /** Delete the account with every book, photo and file it owns. */
  async remove(): Promise<void> {
    const photos = (await Photo.query().where({ userId: this.id }).get()).all()
    const books = (await Book.query().where({ userId: this.id }).get()).all()

    await User.transaction(async () => {
      for (const book of books) await BookPage.query().where({ bookId: book.id }).delete()

      await Book.query().where({ userId: this.id }).delete()
      await Photo.query().where({ userId: this.id }).delete()
      await PersonalAccessToken.query().where({ userId: this.id }).delete()
      await PasswordReset.query().where({ email: this.email }).delete()
      await this.delete()
    })

    for (const photo of photos) {
      await Storage.disk(photo.disk as never)
        .delete(photo.path)
        .catch(() => undefined)
    }

    if (this.avatarPath && this.avatarDisk) {
      await Storage.disk(this.avatarDisk as never)
        .delete(this.avatarPath)
        .catch(() => undefined)
    }
  }
}
