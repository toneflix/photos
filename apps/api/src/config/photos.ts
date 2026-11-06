/**
 * How uploaded photos are stored and served.
 */
export default () => {
  return {
    /**
     * Originals larger than this many megabytes are re-encoded, then scaled down, until they fit.
     */
    max_original_mb: Number(env('PHOTOS_MAX_ORIGINAL_MB', 5)),

    /**
     * The longest side, in pixels, of the WebP copy shown in the app.
     */
    display_max_edge: Number(env('PHOTOS_DISPLAY_MAX_EDGE', 2048)),

    /**
     * WebP quality of the display copy, from 1 to 100.
     */
    display_quality: Number(env('PHOTOS_DISPLAY_QUALITY', 80)),
  }
}
