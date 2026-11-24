/**
 * How books are drawn into print-ready PDFs.
 */
export default () => {
  return {
    /**
     * Cloudflare Browser Run, where pages are drawn. The token needs the "Browser Rendering - Edit" permission.
     */
    cloudflare: {
      account_id: String(env('CLOUDFLARE_ACCOUNT_ID', '')),
      api_token: String(env('CLOUDFLARE_API_TOKEN', '')),
      /** The CDP endpoint sessions are opened on. Empty uses Browser Run for the account above. */
      browser_url: String(env('CLOUDFLARE_BROWSER_URL', '')),
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
