import { Directory, File, Paths } from 'expo-file-system'
import { Asset, requestPermissionsAsync } from 'expo-media-library'
import * as Sharing from 'expo-sharing'
import { DownloadRequest } from './download-request'

/** A photo or zip from the API, fetched with the viewer's sign-in and book code. */
export class ApiDownload extends DownloadRequest {
  /** Saves a photo to the phone's photo library. */
  async saveToPhotos() {
    const { granted } = await requestPermissionsAsync(true)

    if (!granted) throw new Error('Allow Toneflix Photos to add to your photos, then try again.')

    const file = await this.fetchFile()

    try {
      await Asset.create(file.uri)
    } finally {
      file.delete()
    }
  }

  /** Offers a zip to save or send. */
  async share(dialogTitle: string) {
    const file = await this.fetchFile()

    if (!(await Sharing.isAvailableAsync())) throw new Error('This device has no way to save the zip.')

    await Sharing.shareAsync(file.uri, { mimeType: 'application/zip', UTI: 'public.zip-archive', dialogTitle })
  }

  private async fetchFile() {
    const folder = new Directory(Paths.cache, 'downloads')

    if (!folder.exists) folder.create()

    try {
      return await File.downloadFileAsync(this.url, folder, { headers: this.headers, idempotent: true })
    } catch {
      throw new Error(await this.problem())
    }
  }
}
