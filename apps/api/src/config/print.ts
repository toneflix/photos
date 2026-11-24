/**
 * How books are drawn into print-ready PDFs and page images.
 */
export default () => {
  return {
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
  }
}
