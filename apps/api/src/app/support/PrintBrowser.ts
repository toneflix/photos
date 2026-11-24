import { chromium, type Browser } from 'playwright-core'

/**
 * The browser books are drawn in: a Cloudflare Browser Run session, reached over CDP.
 */
export class PrintBrowser {
  /** Where Browser Run hands out sessions over CDP. */
  static readonly BROWSER_RUN = 'wss://api.cloudflare.com/client/v4/accounts/:account/browser-run/devtools/browser'

  /** Whether Browser Run has an account and token to use. */
  static get available(): boolean {
    return !!(config('print.cloudflare.account_id') && config('print.cloudflare.api_token'))
  }

  /** Opens a Browser Run session to draw in. */
  static async open(): Promise<Browser> {
    if (!PrintBrowser.available) throw new Error('Cloudflare Browser Run is not set up to draw book pages.')

    const timeout = Number(config('print.timeout') ?? 180) * 1000
    const endpoint = new URL(
      String(config('print.cloudflare.browser_url') || '') ||
        PrintBrowser.BROWSER_RUN.replace(':account', encodeURIComponent(String(config('print.cloudflare.account_id')))),
    )

    endpoint.searchParams.set('keep_alive', String(timeout))

    return chromium.connectOverCDP(endpoint.toString(), {
      headers: { Authorization: `Bearer ${config('print.cloudflare.api_token')}` },
      timeout,
    })
  }
}
