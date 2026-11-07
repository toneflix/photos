import { createHmac, timingSafeEqual } from 'node:crypto'

/** Checks that a webhook was forwarded by the Toneflix payment relay, once a relay secret is set. */
export class RelayWebhook {
  static readonly header = 'x-relay-signature'

  /** True when no relay secret is set, or the body carries the relay's signature. */
  static accepts(rawBody: Buffer | string | undefined, signature: unknown): boolean {
    const secret = String(config('payments.relay_secret') ?? '')

    if (!secret) return true

    return RelayWebhook.signedBy(secret, rawBody ?? '', signature)
  }

  /** The relay signs the raw body with HMAC-SHA256, hex encoded. */
  static signedBy(secret: string, rawBody: Buffer | string, signature: unknown): boolean {
    const expected = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('hex'))
    const given = Buffer.from(typeof signature === 'string' ? signature : '')

    return given.length === expected.length && timingSafeEqual(given, expected)
  }
}
