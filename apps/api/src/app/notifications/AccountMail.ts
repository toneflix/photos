import { Notification } from '@arkstack/notifications'
import type { User } from '@app/models/User'

/** The emails Toneflix Photos sends about a user's account. */
export class AccountMail {
  static verifyEmail(user: User, link: string) {
    return AccountMail.send(
      user,
      'Confirm your email address',
      `<p>Hi ${AccountMail.escape(user.name)},</p>
      <p>Confirm that this is your email address to keep your Toneflix Photos account safe.</p>
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

  private static send(to: User | string, subject: string, message: string) {
    return Notification.mail()
      .prepare(to as never)
      .subject(subject)
      .send(message)
  }

  private static button(label: string, link: string) {
    return `<p><a href="${AccountMail.escape(link)}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#1f1b16;color:#fbf8f1;text-decoration:none">${label}</a></p>`
  }

  private static escape(value: string) {
    return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)
  }
}
