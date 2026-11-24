import { existsSync } from 'node:fs'

const SYSTEM_BROWSERS = ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']

/**
 * How books are drawn into print-ready PDFs.
 */
export default () => {
  return {
    /**
     * The Chromium binary that draws the pages. Empty uses the system Chromium or Chrome when installed, else Playwright's own.
     * When none of these exists, pages are drawn in Cloudflare Browser Run.
     */
    chromium_path: String(env('PRINT_CHROMIUM_PATH', SYSTEM_BROWSERS.find((browser) => existsSync(browser)) ?? '')),

    /**
     * Cloudflare Browser Run, used when no local Chromium is found. The token needs the "Browser Rendering - Edit" permission.
     */
    cloudflare: {
      account_id: String(env('PRINT_CLOUDFLARE_ACCOUNT_ID', '')),
      api_token: String(env('PRINT_CLOUDFLARE_API_TOKEN', '')),
    },

    /**
     * Printed page width in millimetres. Pages are 3:4, so 210 gives 210 × 280 mm.
     */
    page_width_mm: Number(env('PRINT_PAGE_WIDTH_MM', 210)),

    /**
     * Resolution of page images, in dots per inch. 300 makes a 210 mm page 2480 pixels wide.
     */
    image_dpi: Number(env('PRINT_IMAGE_DPI', 300)),

    /**
     * The longest side, in pixels, photos are printed at: about 300 DPI across a full page.
     */
    photo_max_edge: Number(env('PRINT_PHOTO_MAX_EDGE', 3300)),

    /**
     * Seconds one book may take to draw before it is given up.
     */
    timeout: Number(env('PRINT_TIMEOUT', 180)),
  }
}
