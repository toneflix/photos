import { existsSync } from 'node:fs'
import { chromium, type Browser } from 'playwright-core'

/** A Chromium on this machine: CHROMIUM_PATH, a system Chrome or Chromium, else Playwright's own. */
const localChromium = () =>
  [process.env.CHROMIUM_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', chromium.executablePath()].find(
    (path) => path && existsSync(path),
  )

/**
 * Starts a local Chromium that stands in for Cloudflare Browser Run, and points the print settings at its CDP endpoint.
 * Returns the browser so the suite can close it.
 */
export const startPrintBrowser = async (): Promise<Browser> => {
  const port = 9300 + Math.floor(Math.random() * 600)
  const browser = await chromium.launch({ executablePath: localChromium(), args: [`--remote-debugging-port=${port}`] })
  const { webSocketDebuggerUrl } = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()) as { webSocketDebuggerUrl: string }

  process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account'
  process.env.CLOUDFLARE_API_TOKEN = 'test-token'
  process.env.CLOUDFLARE_BROWSER_URL = webSocketDebuggerUrl

  return browser
}
