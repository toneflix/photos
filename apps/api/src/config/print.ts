/**
 * How books are drawn into print-ready PDFs and page images.
 */
export default () => {
  return {
    /**
     * The short side of printed pages in millimetres; the long side follows each book's page shape,
     * so 210 gives 210 × 280 mm portrait pages and 315 × 210 mm wide ones.
     */
    page_short_side_mm: Number(env('PRINT_PAGE_SHORT_SIDE_MM', env('PRINT_PAGE_WIDTH_MM', 210))),

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
