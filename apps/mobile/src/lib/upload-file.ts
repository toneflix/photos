import type { ImagePickerAsset } from 'expo-image-picker'

/** A picked photo in the `{ uri, name, type }` shape React Native's FormData sends as a file. */
export function uploadFile(asset: ImagePickerAsset) {
  const type = asset.mimeType ?? 'image/jpeg'

  return { uri: asset.uri, name: asset.fileName ?? `photo.${type.split('/')[1] ?? 'jpg'}`, type }
}
