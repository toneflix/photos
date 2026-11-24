import { existsSync } from 'node:fs'

/**
 * How books are drawn into print-ready PDFs.
 */
export default () => {
  return {
    /**
     * The Chromium binary that draws the pages. Empty uses the system Chromium when installed, else Playwright's own.
     */
    chromium_path: String(env('PRINT_CHROMIUM_PATH', existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : '')),

    /**
     * Printed page width in millimetres. Pages are 3:4, so 210 gives 210 × 280 mm.
     */
    page_width_mm: Number(env('PRINT_PAGE_WIDTH_MM', 210)),

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
