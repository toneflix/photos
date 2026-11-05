/** A link to a page on the web app, for sharing. Falls back to the app's own scheme when no web address is set. */
export function webUrl(path: string) {
  const base = process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/$/, '') ?? 'toneflixphotos:/'

  return `${base}${path}`
}

/** A full address on the API. */
export function apiUrl(path: string) {
  return `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api'}${path}`
}

/** The API's download link for an openly licensed public photo. */
export function photoDownloadUrl(id: string) {
  return apiUrl(`/explore/photos/${encodeURIComponent(id)}/download`)
}
