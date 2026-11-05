import { Directory, File, Paths } from 'expo-file-system'
import { Asset, requestPermissionsAsync } from 'expo-media-library'
import { photoDownloadUrl } from './links'

/** Saves the original of an openly licensed public photo to the phone's photo library. */
export async function savePhoto(id: string) {
  const { granted } = await requestPermissionsAsync(true)

  if (!granted) throw new Error('Allow Toneflix Photos to add to your photos, then try again.')

  const folder = new Directory(Paths.cache, 'downloads')

  if (!folder.exists) folder.create()

  const file = await File.downloadFileAsync(photoDownloadUrl(id), folder, { idempotent: true })

  await Asset.create(file.uri)
  file.delete()
}
