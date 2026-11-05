import { Directory, File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { api } from './api'
import { apiUrl } from './links'
import { session } from './session'

/** Downloads a zip of everything in the account, then offers to save or send it. */
export async function downloadAccountExport() {
  const folder = new Directory(Paths.cache, 'exports')

  if (!folder.exists) folder.create()

  const file = await File.downloadFileAsync(apiUrl(api.account.exportPath), folder, {
    headers: { Authorization: `Bearer ${session.getToken()}` },
    idempotent: true,
  })

  if (!(await Sharing.isAvailableAsync())) throw new Error('This device has no way to save the zip.')

  await Sharing.shareAsync(file.uri, { mimeType: 'application/zip', UTI: 'public.zip-archive', dialogTitle: 'Save your Toneflix Photos data' })
}
