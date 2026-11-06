import { useSyncExternalStore } from 'react'
import type { ImagePickerAsset } from 'expo-image-picker'
import { api } from './api'
import { appLimits, megabytes } from './limits'
import { photoLists } from './lists'
import { uploadFile } from './upload-file'

export interface UploadItem {
  key: string
  uri: string
  status: 'waiting' | 'uploading' | 'done' | 'failed'
}

export interface UploadState {
  items: UploadItem[]
  done: number
  failed: string[]
}

/** Uploads picked photos one at a time and reports progress, then refreshes the photo lists. */
export class UploadQueue {
  private state: UploadState = { items: [], done: 0, failed: [] }
  private listeners = new Set<() => void>()

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  getState = () => this.state

  get busy() {
    return this.state.done < this.state.items.length
  }

  async add(assets: ImagePickerAsset[], spaceId?: string) {
    if (!assets.length || this.busy) return

    const stamp = Date.now()
    const { maxPhotoMb } = await appLimits.refresh()

    this.publish({ items: assets.map((asset, i) => ({ key: `${stamp}-${i}`, uri: asset.uri, status: 'waiting' })), done: 0, failed: [] })

    for (const [i, asset] of assets.entries()) {
      const name = asset.fileName ?? `Photo ${i + 1}`

      this.setStatus(i, 'uploading')

      if (asset.fileSize && asset.fileSize > megabytes(maxPhotoMb)) {
        this.fail(i, `${name} is larger than ${maxPhotoMb} MB`)
        continue
      }

      try {
        await api.photos.upload(uploadFile(asset), {
          width: asset.width || undefined,
          height: asset.height || undefined,
          takenAt: takenAt(asset),
          spaceId,
        })
        this.setStatus(i, 'done')
        this.publish({ ...this.state, done: this.state.done + 1 })
      } catch {
        this.fail(i, `${name} didn't upload`)
      }
    }

    photoLists.reload()
  }

  dismiss() {
    if (!this.busy) this.publish({ items: [], done: 0, failed: [] })
  }

  private fail(index: number, reason: string) {
    this.setStatus(index, 'failed')
    this.publish({ ...this.state, done: this.state.done + 1, failed: [...this.state.failed, reason] })
  }

  private setStatus(index: number, status: UploadItem['status']) {
    this.publish({ ...this.state, items: this.state.items.map((item, i) => (i === index ? { ...item, status } : item)) })
  }

  private publish(state: UploadState) {
    this.state = state
    this.listeners.forEach((listener) => listener())
  }
}

/** When the photo was taken, from its EXIF date ("2024:06:01 18:30:00"), if the picker gave one. */
function takenAt(asset: ImagePickerAsset) {
  const stamp = asset.exif?.DateTimeOriginal ?? asset.exif?.DateTime

  if (typeof stamp !== 'string') return undefined

  const date = new Date(stamp.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3').replace(' ', 'T'))

  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

export const uploads = new UploadQueue()

export function useUploads() {
  return useSyncExternalStore(uploads.subscribe, uploads.getState)
}
