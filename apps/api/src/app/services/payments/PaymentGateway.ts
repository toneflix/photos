/** What a gateway needs to start a payment. */
export interface PaymentRequest {
  reference: string
  amount: number
  currency: string
  email: string
  name: string
  title: string
  returnUrl: string
}

/** A gateway's answer about one payment. `final` is false while the payer can still finish it. */
export interface PaymentResult {
  paid: boolean
  final: boolean
  amount: number
  currency: string | null
  raw: Record<string, unknown>
}

/** A payment provider the checkout can send payers to. */
export interface PaymentGateway {
  readonly key: string
  enabled(): boolean
  /** Start a payment and return the page the payer completes it on. */
  initialize(request: PaymentRequest): Promise<{ url: string }>
  verify(reference: string): Promise<PaymentResult>
}
