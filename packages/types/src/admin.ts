/** Limits the API enforces that apps can check before sending anything. Open to everyone. */
export interface AppLimits {
  maxPhotoMb: number
  maxAvatarMb: number
  maxBookPages: number
  registrationOpen: boolean
}
