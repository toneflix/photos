import { Directory, File, Paths } from 'expo-file-system'
import { Asset, requestPermissionsAsync } from 'expo-media-library'
import * as Sharing from 'expo-sharing'
import { DownloadRequest } from './download-request'

/** What the system share sheet is told about a file. */
export interface ShareType {
  mimeType: string
  UTI: string
}

/** A photo, zip or PDF from the API, fetched with the viewer's sign-in and book code. */
export class ApiDownload extends DownloadRequest {
  static readonly ZIP: ShareType = { mimeType: 'application/zip', UTI: 'public.zip-archive' }
  static readonly PDF: ShareType = { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' }

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

  /** Offers a zip or another file to save or send. */
  async share(dialogTitle: string, type: ShareType = ApiDownload.ZIP) {
    const file = await this.fetchFile()

    if (!(await Sharing.isAvailableAsync())) throw new Error('This device has no way to save the file.')

    await Sharing.shareAsync(file.uri, { ...type, dialogTitle })
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
