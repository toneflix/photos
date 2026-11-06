import { Collection } from './Collection'
import { SharedSpaceResource } from './SharedSpaceResource'

export class SharedSpaceCollection extends Collection {
  collects = SharedSpaceResource
}
