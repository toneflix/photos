import { Collection } from './Collection'
import { PhotoResource } from './PhotoResource'

export class PhotoCollection extends Collection {
  collects = PhotoResource
}
