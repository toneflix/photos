/**
 * The largest files people can upload. Admins can change these in the dashboard.
 */
export default () => {
  return {
    /**
     * The largest photo upload, in megabytes.
     */
    max_photo_mb: Number(env('UPLOADS_MAX_PHOTO_MB', 25)),

    /**
     * The largest profile photo upload, in megabytes.
     */
    max_avatar_mb: Number(env('UPLOADS_MAX_AVATAR_MB', 10)),
  }
}
