import { createPhotosAlova, type PhotosClientOptions } from './client'
import { createEndpoints } from './endpoints'

export * from './client'
export * from './endpoints'

/** Create an alova instance plus typed endpoints in one call. */
export function createPhotosClient(options: PhotosClientOptions) {
  const alova = createPhotosAlova(options)
  return { alova, api: createEndpoints(alova) }
}

export type PhotosClient = ReturnType<typeof createPhotosClient>
