import { Storage } from '@arkstack/filesystem'
import { randomUUID } from 'node:crypto'
import { appUrl } from '@arkstack/common'
import type { Photo } from '@app/models/Photo'

/**
 * The disk photos are written to. Defaults to the `public` local disk in
 * development; set PHOTOS_DISK=s3 (any S3-compatible bucket, e.g. R2) in production.
 */
export const photosDisk = (): string => {
  const configured = String(env('PHOTOS_DISK', '') || '')
  if (configured) return configured

  const fallback = String(env('FILESYSTEM_DISK', 'local') || 'local')
  return fallback === 'local' ? 'public' : fallback
}

const LOCAL_DISKS = ['local', 'public']

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

export const ACCEPTED_MIME_TYPES = Object.keys(EXTENSIONS)

/** Write an uploaded photo to storage and return where it went. */
export async function storePhoto(userId: string, file: { buffer: Buffer; mimetype: string }) {
  const disk = photosDisk()
  const ext = EXTENSIONS[file.mimetype] ?? 'bin'
  const path = `photos/${userId}/${randomUUID()}.${ext}`

  await Storage.disk(disk as never).put(path, new Uint8Array(file.buffer))

  return { disk, path }
}

export async function deletePhotoFile(photo: Photo) {
  try {
    await Storage.disk(photo.disk as never).delete(photo.path)
  } catch {
    // The file is already gone; nothing left to clean up.
  }
}

/** Public URL for a stored photo. Local disks are served by the API under /media. */
export async function photoUrl(photo: Photo): Promise<string> {
  if (LOCAL_DISKS.includes(photo.disk)) {
    return appUrl(`media/${photo.path}`)
  }

  return await Storage.disk(photo.disk as never).getUrl(photo.path)
}
