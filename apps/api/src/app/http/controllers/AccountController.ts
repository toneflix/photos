import { AccountArchive } from '@app/services/AccountArchive'
import { BaseController } from './BaseController'
import { Book } from '@app/models/Book'
import { GenericResource } from 'resora'
import { Photo } from '@app/models/Photo'
import { UserResource } from '@app/http/resources/UserResource'
import { abortIf } from '@arkstack/common'
import { Username, photoFile } from '@app/support/rules'
import { User } from '@app/models/User'
import { Settings } from '@app/support/Settings'

/**
 * The signed-in user's profile, sign-in details, privacy choices and data.
 */
export default class AccountController extends BaseController {
  async updateProfile() {
    this.body.username = typeof this.body.username === 'string' ? this.body.username.trim().toLowerCase() : this.body.username

    const data = await this.validate({
      name: 'required|string|max:120',
      username: ['nullable', 'string', new Username(), `unique:users,username,${this.user.username}`],
    })

    await this.user.update({ name: String(data.name).trim(), username: data.username || this.user.username })

    return new UserResource(this.user).additional({ status: 'success', message: 'Profile saved', code: 200 })
  }

  async updateAvatar() {
    const data = await this.validate({
      avatar: photoFile((await Settings.number('uploads.max_avatar_mb')) * 1024),
    })

    await this.user.setAvatar(data.avatar)

    return new UserResource(this.user).additional({ status: 'success', message: 'Profile photo updated', code: 200 })
  }

  async removeAvatar() {
    await this.user.removeAvatar()

    return new UserResource(this.user).additional({ status: 'success', message: 'Profile photo removed', code: 200 })
  }

  async updateEmail() {
    this.body.email = User.normalizeEmail(this.body.email)

    const data = await this.validate({
      email: 'required|email|max:191|unique:users,email',
      password: 'required|string',
    })

    await this.confirmPassword(data.password)
    await this.user.changeEmail(String(data.email))

    return new UserResource(this.user).additional({
      status: 'success',
      message: 'Email changed. Check your inbox to confirm it.',
      code: 200,
    })
  }

  async updatePassword() {
    const data = await this.validate({
      currentPassword: 'required|string',
      password: 'required|string|min:8|max:191|confirmed',
    })

    await this.confirmPassword(data.currentPassword, 'currentPassword')
    await this.user.changePassword(String(data.password), (this.ctx.req as any).authToken)

    return new UserResource(this.user).additional({
      status: 'success',
      message: 'Password changed. Your other devices were signed out.',
      code: 200,
    })
  }

  async sendVerification() {
    abortIf(this.user.hasVerifiedEmail(), 'Your email is already confirmed.', 422)

    await this.user.sendVerificationEmail()

    return new UserResource(this.user).additional({ status: 'success', message: 'Confirmation email sent', code: 200 })
  }

  async updatePrivacy() {
    const data = await this.validate({
      defaultVisibility: `nullable|in:${Book.VISIBILITIES.join(',')}`,
      showOwnerName: 'nullable|boolean',
      showCounts: 'nullable|boolean',
      defaultLicense: `nullable|in:${Photo.LICENSES.join(',')}`,
    })

    await this.user.updatePreferences({
      defaultVisibility: data.defaultVisibility || undefined,
      showOwnerName: typeof data.showOwnerName === 'boolean' ? data.showOwnerName : undefined,
      showCounts: typeof data.showCounts === 'boolean' ? data.showCounts : undefined,
      defaultLicense: data.defaultLicense || undefined,
    })

    return new UserResource(this.user).additional({ status: 'success', message: 'Privacy settings saved', code: 200 })
  }

  /** Make every book private at once. */
  async lockBooks() {
    const books = (await this.user.books().whereIn('visibility', ['shared', 'public']).getResults()).all()

    for (const book of books) await book.update({ visibility: 'private', publishedAt: null })

    return new GenericResource({ updated: books.length }).additional({
      status: 'success',
      message: 'All your books are private now',
      code: 200,
    })
  }

  /** A zip of the user's photos plus their books and account as JSON. */
  async export() {
    return new AccountArchive(this.user).response()
  }

  async destroy() {
    const data = await this.validate({ password: 'required|string' })

    await this.confirmPassword(data.password)
    await this.user.remove()

    return new GenericResource({ deleted: true }).additional({
      status: 'success',
      message: 'Your account and everything in it was deleted',
      code: 200,
    })
  }
}
