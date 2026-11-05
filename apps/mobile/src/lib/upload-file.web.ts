import type { ImagePickerAsset } from 'expo-image-picker'

/** The picked photo's File, for the web preview's FormData. */
export function uploadFile(asset: ImagePickerAsset) {
  if (!asset.file) throw new Error('The browser did not hand over the photo.')

  return asset.file
}
