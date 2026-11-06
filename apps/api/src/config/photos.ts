/**
 * How uploaded photos are stored and served.
 */
export default () => {
  return {
    /**
     * Originals larger than this many megabytes are re-encoded, then scaled down, until they fit.
     */
    max_original_mb: Number(env('PHOTOS_MAX_ORIGINAL_MB', 5)),
  }
}
