import { existsSync } from 'node:fs'
import { chromium, type Browser } from 'playwright-core'

/**
 * The browser books are drawn in. A Chromium installed with the API comes first; when none is found,
 * a Cloudflare Browser Run session is used over CDP.
 */
export class PrintBrowser {
  /** Where Browser Run hands out sessions over CDP. */
  static readonly BROWSER_RUN = 'wss://api.cloudflare.com/client/v4/accounts/:account/browser-run/devtools/browser'

  /** A local Chromium binary that exists: the configured one, else Playwright's own. */
  static localPath(): string | null {
    const configured = String(config('print.chromium_path') ?? '')

    if (configured) return existsSync(configured) ? configured : null

    const bundled = chromium.executablePath()

    return existsSync(bundled) ? bundled : null
  }

  /** Whether Browser Run has an account and token to use. */
  static get hasBrowserRun(): boolean {
    return !!(config('print.cloudflare.account_id') && config('print.cloudflare.api_token'))
  }

  /** Which browser the next book is drawn in. */
  static source(): 'local' | 'cloudflare' | null {
    if (PrintBrowser.localPath()) return 'local'

    return PrintBrowser.hasBrowserRun ? 'cloudflare' : null
  }

  /** Opens a browser to draw in, or fails with the reason none could be found. */
  static async open(): Promise<Browser> {
    const path = PrintBrowser.localPath()

    if (path) return chromium.launch({ executablePath: path })
    if (!PrintBrowser.hasBrowserRun) throw new Error('No browser is set up to draw book pages. Install Chromium or add a Cloudflare Browser Run token.')

    const timeout = Number(config('print.timeout') ?? 180) * 1000
    const endpoint = PrintBrowser.BROWSER_RUN.replace(':account', encodeURIComponent(String(config('print.cloudflare.account_id'))))

    return chromium.connectOverCDP(`${endpoint}?keep_alive=${timeout}`, {
      headers: { Authorization: `Bearer ${config('print.cloudflare.api_token')}` },
      timeout,
    })
  }
}
