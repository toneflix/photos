import { Model } from 'arkormx'
import { randomBytes } from 'node:crypto'

export class PasswordReset extends Model {
  declare id: string
  declare email: string | null
  declare phone: string | null
  declare token: string
  declare createdAt: Date
  declare updatedAt: Date

  /** How long a reset link works, in minutes. */
  static readonly TTL_MINUTES = 60

  protected static override table = 'password_resets'

  /** Replace any earlier reset for the address with a fresh one. */
  static async issueFor(email: string): Promise<PasswordReset> {
    await this.query().where({ email }).delete()

    return this.query().create({ email, token: randomBytes(24).toString('hex') })
  }

  static fromToken(token: string) {
    if (token.length > 6) {
      token = Buffer.from(token, 'base64url').toString().split('-')[0]
    }

    return this.query().where({ token }).first()
  }

  isExpired(): boolean {
    return Date.now() - new Date(this.createdAt).getTime() > PasswordReset.TTL_MINUTES * 60_000
  }

  /**
   * get the password reset link
   */
  link() {
    const b64Token = Buffer.from(
      str(this.token)
        .append('-' + Math.random())
        .toString(),
    ).toString('base64url')

    return `${config('app.frontend_url')}/reset-password?token=${b64Token}`
  }
}
