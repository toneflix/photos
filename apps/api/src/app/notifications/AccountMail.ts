import { Notification } from '@arkstack/notifications'
import type { Space } from '@app/models/Space'
import type { User } from '@app/models/User'

/** The emails Toneflix Photos sends about a user's account. */
export class AccountMail {
  static verifyEmail(user: User, link: string) {
    return AccountMail.send(
      user,
      'Confirm your email address',
      `<p>Hi ${AccountMail.escape(user.name)},</p>
      <p>Confirm this is your email address for Toneflix Photos.</p>
      ${AccountMail.button('Confirm email', link)}
      <p>The link works for 24 hours. If you didn't create an account, you can ignore this email.</p>`,
    )
  }

  static resetPassword(user: User, link: string, minutes: number) {
    return AccountMail.send(
      user,
      'Reset your password',
      `<p>Hi ${AccountMail.escape(user.name)},</p>
      <p>Someone asked to reset the password for your Toneflix Photos account.</p>
      ${AccountMail.button('Choose a new password', link)}
      <p>The link works for ${minutes} minutes. If it wasn't you, ignore this email and your password stays the same.</p>`,
    )
  }

  static passwordChanged(user: User) {
    return AccountMail.send(
      user,
      'Your password was changed',
      `<p>Hi ${AccountMail.escape(user.name)},</p>
      <p>The password for your Toneflix Photos account was just changed and your other devices were signed out.</p>
      <p>If this wasn't you, reset your password straight away.</p>
      ${AccountMail.button('Reset password', `${config('app.frontend_url')}/forgot-password`)}`,
    )
  }

  static emailChanged(user: User, previous: string) {
    return AccountMail.send(
      previous,
      'Your email address was changed',
      `<p>Hi ${AccountMail.escape(user.name)},</p>
      <p>The email for your Toneflix Photos account was changed from this address to ${AccountMail.escape(user.email)}.</p>
      <p>If this wasn't you, reply to this email so we can help you recover the account.</p>`,
    )
  }

  static spaceInvite(email: string, inviter: User, space: Space) {
    return AccountMail.send(
      email,
      `${inviter.name} invited you to ${space.name}`,
      `<p>Hi,</p>
      <p>${AccountMail.escape(inviter.name)} invited you to join the space “${AccountMail.escape(space.name)}” on Toneflix Photos.</p>
      ${AccountMail.button('See the invite', `${config('app.frontend_url')}/invites`)}
      <p>Sign in or create an account with this email address to accept it. If you weren't expecting it, you can ignore this email.</p>`,
    )
  }

  private static send(to: User | string, subject: string, message: string) {
    return Notification.mail()
      .prepare(to as never, { frontend_url: config('app.frontend_url') })
      .view('mails/default')
      .subject(subject)
      .send(message)
  }

  private static button(label: string, link: string) {
    return `<p><a href="${AccountMail.href(link)}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#f6c101;color:#111c33;font-weight:600;text-decoration:none">${label}</a></p>`
  }

  /** Percent-encodes the characters that would end the attribute, so the link needs no HTML entities. */
  private static href(link: string) {
    return link.replace(/["'<>]/g, (char) => encodeURIComponent(char))
  }

  private static escape(value: string) {
    return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)
  }
}
