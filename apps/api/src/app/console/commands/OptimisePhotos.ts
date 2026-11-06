import { Command } from '@h3ravel/musket'
import { Photo } from '@app/models/Photo'

/** Makes WebP display copies for photos stored before uploads were optimised. */
export class OptimisePhotosCommand extends Command {
  signature = 'photos:optimise'

  description = 'Make WebP display copies for photos that have none'

  async handle() {
    const photos = (await Photo.query().whereNull('displayPath').get()).all()
    let optimised = 0

    for (const photo of photos) {
      if (await photo.optimise().catch(() => false)) optimised++
    }

    this.success(`Made display copies for ${optimised} of ${photos.length} photos.`)
  }
}
