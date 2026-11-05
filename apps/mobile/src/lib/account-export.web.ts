import { api } from './api'
import { apiUrl } from './links'
import { session } from './session'

/** Downloads a zip of everything in the account in the web preview. */
export async function downloadAccountExport() {
  const response = await fetch(apiUrl(api.account.exportPath), { headers: { Authorization: `Bearer ${session.getToken()}` } })

  if (!response.ok) throw new Error("We couldn't make your download. Try again in a minute.")

  const name = /filename="?([^";]+)"?/.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ?? 'toneflix-photos.zip'
  const link = document.createElement('a')

  link.href = URL.createObjectURL(await response.blob())
  link.download = name
  link.click()
  URL.revokeObjectURL(link.href)
}
