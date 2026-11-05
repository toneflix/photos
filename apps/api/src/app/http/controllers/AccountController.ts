import { AccountArchive } from '@app/services/AccountArchive'
import { BaseController } from './BaseController'
import { Book } from '@app/models/Book'
import { GenericResource } from 'resora'
import { Photo } from '@app/models/Photo'
import { UserResource } from '@app/http/resources/UserResource'
import { abortIf } from '@arkstack/common'
import { photoFile } from '@app/support/rules'
import { User } from '@app/models/User'

/**
 * The signed-in user's profile, sign-in details, privacy choices and data.
 */
export default class AccountController extends BaseController {
  async updateProfile() {
    const data = await this.validate({ name: 'required|string|max:120' })

    await this.user.update({ name: String(data.name).trim() })

    return new UserResource(this.user).additional({ status: 'success', message: 'Profile saved', code: 200 })
  }

  async updateAvatar() {
    const data = await this.validate({
      avatar: photoFile(User.AVATAR_MAX_KILOBYTES),
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
      defaultLicense: `nullable|in:${Photo.LICENSES.join(',')}`,
    })

    await this.user.updatePreferences({
      defaultVisibility: data.defaultVisibility || undefined,
      showOwnerName: typeof data.showOwnerName === 'boolean' ? data.showOwnerName : undefined,
      defaultLicense: data.defaultLicense || undefined,
    })

    return new UserResource(this.user).additional({ status: 'success', message: 'Privacy settings saved', code: 200 })
  }

  /** Make every book private at once. */
  async lockBooks() {
    const books = (await Book.query().where({ userId: this.user.id }).whereIn('visibility', ['shared', 'public'] as never).get()).all()

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
