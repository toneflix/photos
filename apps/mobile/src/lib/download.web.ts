import { photoDownloadUrl } from './links'

/** Downloads the original of an openly licensed public photo in the web preview. */
export async function savePhoto(id: string) {
  window.open(photoDownloadUrl(id), '_blank')
}
