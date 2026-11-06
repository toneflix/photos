import { DownloadRequest } from './download-request'

/** A photo or zip from the API, downloaded by the browser in the web preview. */
export class ApiDownload extends DownloadRequest {
  saveToPhotos() {
    return this.save()
  }

  share() {
    return this.save()
  }

  private async save() {
    const response = await fetch(this.url, { headers: this.headers })

    if (!response.ok) throw new Error(await this.problem(response))

    const name = /filename="?([^";]+)"?/.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ?? 'toneflix-photos'
    const link = document.createElement('a')

    link.href = URL.createObjectURL(await response.blob())
    link.download = name
    link.click()
    URL.revokeObjectURL(link.href)
  }
}
