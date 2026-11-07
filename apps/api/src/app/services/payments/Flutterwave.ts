import type { PaymentGateway, PaymentRequest, PaymentResult } from './PaymentGateway'
import { ValidationException } from 'kanun'
import { timingSafeEqual } from 'node:crypto'

/** Takes payments through Flutterwave's hosted checkout. */
export class Flutterwave implements PaymentGateway {
  readonly key = 'flutterwave'

  enabled(): boolean {
    return !!this.secret()
  }

  async initialize(request: PaymentRequest): Promise<{ url: string }> {
    const unreachable = { ok: false, body: { message: 'We could not reach Flutterwave. Please try again.' } as Record<string, unknown> }
    const response = await this.send('/payments', {
      method: 'POST',
      body: JSON.stringify({
        tx_ref: request.reference,
        amount: request.amount,
        currency: request.currency,
        redirect_url: request.returnUrl,
        customer: { email: request.email, name: request.name },
        customizations: { title: String(config('app.name')), description: request.title },
        meta: { app: 'photos' },
      }),
    }).catch(() => unreachable)
    const url = (response.body.data as { link?: string } | undefined)?.link

    if (!response.ok || !url) throw ValidationException.withMessages({ plan: Flutterwave.message(response.body) })

    return { url }
  }

  async verify(reference: string): Promise<PaymentResult> {
    const pending = (raw: Record<string, unknown>): PaymentResult => ({ paid: false, final: false, amount: 0, currency: null, raw })
    const response = await this.send(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`).catch((error: Error) => ({
      ok: false,
      body: { message: error.message } as Record<string, unknown>,
    }))

    // Nothing paid under this reference yet, e.g. the payer left the checkout open.
    if (!response.ok) return pending(response.body)

    const data = (response.body.data ?? {}) as Record<string, unknown>
    const status = String(data.status ?? '').toLowerCase()

    return {
      paid: status === 'successful' && (data.tx_ref ?? reference) === reference,
      final: status === 'successful' || status === 'failed',
      amount: Number(data.amount ?? 0),
      currency: data.currency ? String(data.currency).toUpperCase() : null,
      raw: data,
    }
  }

  /** Flutterwave signs webhooks by sending back the secret hash set in its dashboard. */
  validWebhook(hash: unknown): boolean {
    const secret = String(config('payments.flutterwave.webhook_hash') ?? '')

    if (!secret || typeof hash !== 'string' || hash.length !== secret.length) return false

    return timingSafeEqual(Buffer.from(hash), Buffer.from(secret))
  }

  private secret(): string {
    return String(config('payments.flutterwave.secret_key') ?? '')
  }

  private async send(path: string, init: RequestInit = {}): Promise<{ ok: boolean; body: Record<string, unknown> }> {
    const response = await fetch(`${config('payments.flutterwave.api_url')}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.secret()}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: AbortSignal.timeout(30_000),
    })

    return { ok: response.ok, body: ((await response.json().catch(() => ({}))) ?? {}) as Record<string, unknown> }
  }

  private static message(body: Record<string, unknown>): string {
    return String(body.message || 'Flutterwave could not start this payment. Please try again.')
  }
}
